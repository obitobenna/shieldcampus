// Clears testnet activity so /impact starts from zero on mainnet.
//
// Dry run (default, changes nothing):   npm run reset-for-mainnet
// Actually delete:                      npm run reset-for-mainnet -- --confirm
// Keep extra accounts besides admins:   npm run reset-for-mainnet -- --keep a@x.com,b@y.com
//
// Deletes: sales, reward claims, vendors, lesson progress, tutor chats, rate limits,
//          and every non-admin account (test students/vendors).
// Keeps:   lessons, translations, quiz questions, settings, admin accounts
//          (their saved testnet address is cleared, since mainnet rejects it).
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const keepIdx = args.indexOf("--keep");
const keepEmails = new Set(
  keepIdx >= 0 ? (args[keepIdx + 1] ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) : [],
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// Every row matches this filter; Supabase refuses unfiltered deletes.
const ALL_UUID = "00000000-0000-0000-0000-000000000000";

async function count(table: string): Promise<number> {
  const { count: n, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return n ?? 0;
}

async function listUsers(): Promise<{ id: string; email: string }[]> {
  const out: { id: string; email: string }[] = [];
  for (let page = 1; page < 100; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    out.push(...data.users.map((u) => ({ id: u.id, email: (u.email ?? "").toLowerCase() })));
    if (data.users.length < 1000) break;
  }
  return out;
}

async function main(): Promise<void> {
  const users = await listUsers();
  const { data: profiles, error } = await db.from("profiles").select("id, role");
  if (error) throw new Error(error.message);
  const roleOf = new Map(profiles.map((p) => [p.id as string, p.role as string]));

  const keep = users.filter((u) => roleOf.get(u.id) === "admin" || keepEmails.has(u.email));
  const remove = users.filter((u) => !keep.includes(u));

  const tables = ["sales", "reward_claims", "vendors", "lesson_progress", "tutor_messages"] as const;
  console.log(confirm ? "DELETING testnet data:\n" : "DRY RUN (nothing changes). Would delete:\n");
  for (const t of tables) console.log(`  ${t.padEnd(16)} ${await count(t)} rows`);
  console.log(`  accounts         ${remove.length}`);
  for (const u of remove) console.log(`     - ${u.email || u.id} (${roleOf.get(u.id) ?? "no profile"})`);
  console.log(`\nKeeping ${keep.length} account(s):`);
  for (const u of keep) console.log(`     + ${u.email || u.id} (${roleOf.get(u.id) ?? "no profile"})`);
  console.log("Keeping lessons, translations, quiz questions and settings.");

  if (keep.every((u) => roleOf.get(u.id) !== "admin")) {
    console.error("\nNo admin account found. Refusing to continue: you would lock yourself out of /admin.");
    process.exit(1);
  }
  if (!confirm) {
    console.log("\nRun again with --confirm to delete.");
    return;
  }

  // Children before parents: claims block profile deletion (on delete restrict).
  // bigint ids: match every row with id >= 0. uuid keys: match every row with key != the nil uuid.
  const deletes = [
    ["sales", db.from("sales").delete().gte("id", 0)],
    ["reward_claims", db.from("reward_claims").delete().gte("id", 0)],
    ["tutor_messages", db.from("tutor_messages").delete().gte("id", 0)],
    ["vendors", db.from("vendors").delete().neq("id", ALL_UUID)],
    ["lesson_progress", db.from("lesson_progress").delete().neq("user_id", ALL_UUID)],
  ] as const;
  for (const [t, q] of deletes) {
    const { error: e } = await q;
    if (e) throw new Error(`${t}: ${e.message}`);
  }
  const { error: rl } = await db.from("rate_limits").delete().neq("key", "");
  if (rl) throw new Error(`rate_limits: ${rl.message}`);

  for (const u of remove) {
    const { error: e } = await db.auth.admin.deleteUser(u.id); // profile row cascades
    if (e) throw new Error(`delete ${u.email}: ${e.message}`);
  }
  const { error: ca } = await db.from("profiles").update({ zcash_address: null }).in("id", keep.map((u) => u.id));
  if (ca) throw new Error(`clear admin addresses: ${ca.message}`);

  console.log("\nDone. /impact will show zeros within about a minute (it is cached for 60s).");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
