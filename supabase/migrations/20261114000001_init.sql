-- ShieldCampus initial schema
-- Roles: student, vendor, admin. RLS on every table.
-- All privileged writes go through server API routes using the service role
-- after zod validation and role checks; clients get read access to their own rows.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------
create type public.user_role as enum ('student', 'vendor', 'admin');
create type public.progress_status as enum ('in_progress', 'completed');
create type public.claim_status as enum ('submitted', 'approved', 'paid', 'rejected');
create type public.vendor_status as enum ('pending', 'approved', 'suspended');
create type public.vendor_category as enum (
  'food', 'printing', 'data', 'barber', 'fashion', 'stationery', 'transport', 'other'
);
create type public.sale_status as enum ('pending', 'paid', 'cancelled');
create type public.verification_method as enum ('manual', 'viewing_key');

-- ---------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------

-- Shielded addresses only: unified (u1 / utest1) or Sapling (zs1 / ztestsapling1).
-- Bech32 data charset excludes 1, b, i, o. Checksums are verified in the app (lib/zcash.ts).
create or replace function public.is_shielded_zcash_address(addr text)
returns boolean
language sql
immutable
as $$
  select addr ~ '^(u1[02-9ac-hj-np-z]{90,}|utest1[02-9ac-hj-np-z]{90,}|zs1[02-9ac-hj-np-z]{75}|ztestsapling1[02-9ac-hj-np-z]{75})$'
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  university text not null check (char_length(university) between 2 and 120),
  role public.user_role not null default 'student',
  zcash_address text unique
    check (zcash_address is null or public.is_shielded_zcash_address(zcash_address)),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'pcm')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile when a user signs up. Metadata can only choose student or vendor;
-- admin is granted exclusively by `npm run make-admin`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_university text;
  v_role public.user_role := 'student';
begin
  v_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'Student'), 80);
  if char_length(v_name) < 2 then
    v_name := 'Student';
  end if;

  v_university := left(
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'university'), ''), 'University of Nigeria, Nsukka'),
    120
  );
  if char_length(v_university) < 2 then
    v_university := 'University of Nigeria, Nsukka';
  end if;

  if new.raw_user_meta_data ->> 'account_type' = 'vendor' then
    v_role := 'vendor';
  end if;

  insert into public.profiles (id, name, university, role)
  values (new.id, v_name, v_university, v_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------
-- Lessons & quizzes
-- ---------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  position int not null unique check (position > 0),
  title text not null,
  summary text not null,
  content text not null,
  estimated_minutes int not null default 5 check (estimated_minutes > 0),
  -- [{ "id": "installed", "label": "..." }] — used by the wallet setup lesson
  checkpoints jsonb not null default '[]'::jsonb check (jsonb_typeof(checkpoints) = 'array'),
  reward_eligible boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

-- Cached AI translations (Nigerian Pidgin = 'pcm'). source_hash invalidates stale copies.
create table public.lesson_translations (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  language text not null check (language in ('pcm')),
  title text not null,
  summary text not null,
  content text not null,
  source_hash text not null,
  created_at timestamptz not null default now(),
  primary key (lesson_id, language)
);

-- Correct answers live here, so this table is server-only (no client policies).
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position int not null check (position > 0),
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct_index int not null check (correct_index >= 0),
  explanation text not null,
  unique (lesson_id, position)
);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status public.progress_status not null default 'in_progress',
  checkpoints_done jsonb not null default '[]'::jsonb check (jsonb_typeof(checkpoints_done) = 'array'),
  attempts int not null default 0 check (attempts >= 0),
  best_score int not null default 0 check (best_score >= 0),
  last_score int check (last_score >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create trigger lesson_progress_updated_at before update on public.lesson_progress
  for each row execute function public.set_updated_at();

create index lesson_progress_completed_idx on public.lesson_progress (completed_at)
  where status = 'completed';

-- ---------------------------------------------------------------
-- Reward claims
-- ---------------------------------------------------------------
create table public.reward_claims (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete restrict,
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  zcash_address text not null check (public.is_shielded_zcash_address(zcash_address)),
  amount_zec numeric(16, 8) not null check (amount_zec > 0),
  memo text not null default '',
  zip321_uri text,
  status public.claim_status not null default 'submitted',
  txid text check (txid is null or txid ~ '^[0-9a-f]{64}$'),
  verified_by public.verification_method,
  verified_at timestamptz,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  paid_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- One live reward per address per lesson (rejected claims don't block a retry).
create unique index reward_claims_address_lesson_idx
  on public.reward_claims (zcash_address, lesson_id)
  where status <> 'rejected';
create index reward_claims_status_idx on public.reward_claims (status, created_at);
create unique index reward_claims_txid_idx on public.reward_claims (txid) where txid is not null;

create or replace function public.reward_claims_set_memo()
returns trigger
language plpgsql
as $$
begin
  new.memo := 'ShieldCampus reward #' || new.id;
  return new;
end;
$$;

create trigger reward_claims_memo before insert on public.reward_claims
  for each row execute function public.reward_claims_set_memo();
create trigger reward_claims_updated_at before update on public.reward_claims
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Vendors & sales
-- ---------------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category public.vendor_category not null,
  location text not null check (char_length(location) between 2 and 120),
  description text check (description is null or char_length(description) <= 280),
  zcash_address text not null unique check (public.is_shielded_zcash_address(zcash_address)),
  status public.vendor_status not null default 'pending',
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vendors_updated_at before update on public.vendors
  for each row execute function public.set_updated_at();

create table public.sales (
  id bigint generated always as identity primary key,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  amount_ngn numeric(14, 2) not null check (amount_ngn > 0),
  amount_zec numeric(16, 8) not null check (amount_zec > 0),
  rate_ngn_per_zec numeric(18, 2) not null check (rate_ngn_per_zec > 0),
  rate_source text not null check (rate_source in ('coingecko', 'fallback')),
  memo text not null default '',
  note text check (note is null or char_length(note) <= 80),
  zip321_uri text,
  status public.sale_status not null default 'pending',
  txid text check (txid is null or txid ~ '^[0-9a-f]{64}$'),
  verified_by public.verification_method,
  verified_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_vendor_idx on public.sales (vendor_id, created_at desc);
create index sales_status_idx on public.sales (status, paid_at);
create unique index sales_txid_idx on public.sales (txid) where txid is not null;

create or replace function public.sales_set_memo()
returns trigger
language plpgsql
as $$
begin
  new.memo := 'ShieldCampus sale #' || new.id;
  return new;
end;
$$;

create trigger sales_memo before insert on public.sales
  for each row execute function public.sales_set_memo();
create trigger sales_updated_at before update on public.sales
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Tutor, settings, rate limits
-- ---------------------------------------------------------------
create table public.tutor_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 8000),
  language text not null default 'en' check (language in ('en', 'pcm')),
  created_at timestamptz not null default now()
);

create index tutor_messages_user_idx on public.tutor_messages (user_id, lesson_id, created_at);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

-- Fixed-window rate limiter shared by every server instance.
-- Returns true when the request is allowed.
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else rl.count + 1
    end,
    window_start = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else rl.window_start
    end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- ---------------------------------------------------------------
-- Grants (explicit, so this works even where Supabase doesn't auto-expose tables)
-- ---------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_shielded_zcash_address(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_translations enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.reward_claims enable row level security;
alter table public.vendors enable row level security;
alter table public.sales enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.settings enable row level security;
alter table public.rate_limits enable row level security;

-- Profiles: read own (admins read all). Users may edit only safe columns.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name, university, preferred_language) on public.profiles to authenticated;

-- Lessons and translations: public read of published lessons.
create policy "lessons: public read" on public.lessons
  for select to anon, authenticated using (published);
create policy "lesson_translations: public read" on public.lesson_translations
  for select to anon, authenticated using (
    exists (select 1 from public.lessons l where l.id = lesson_id and l.published)
  );

-- quiz_questions: intentionally no policies (server-only, protects answers).

create policy "lesson_progress: read own" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "reward_claims: read own" on public.reward_claims
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "vendors: public read approved" on public.vendors
  for select to anon, authenticated using (status = 'approved');
create policy "vendors: owner and admin read" on public.vendors
  for select to authenticated using (owner_id = auth.uid() or public.is_admin());

create policy "sales: vendor owner read" on public.sales
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid())
  );

create policy "tutor_messages: read own" on public.tutor_messages
  for select to authenticated using (user_id = auth.uid());

-- settings, rate_limits: no policies (server-only).

-- Clients never write directly to these tables; the server does, with the service role.
revoke insert, update, delete on
  public.lessons, public.lesson_translations, public.quiz_questions, public.lesson_progress,
  public.reward_claims, public.vendors, public.sales, public.tutor_messages,
  public.settings, public.rate_limits
from anon, authenticated;
