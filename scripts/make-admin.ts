// Grants the admin role to an existing account.
// Usage: npm run make-admin -- someone@example.com
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  console.error("Usage: npm run make-admin -- someone@example.com");
  process.exit(1);
}
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function findUserId(target: string): Promise<string | null> {
  for (let page = 1; page < 100; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function main(): Promise<void> {
  const id = await findUserId(email!);
  if (!id) {
    console.error(`No account found for ${email}. Sign up in the app first.`);
    process.exit(1);
  }
  const { error } = await supabase.from("profiles").update({ role: "admin" }).eq("id", id);
  if (error) throw new Error(error.message);
  console.log(`${email} is now an admin. Log out and back in to see admin pages.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
