import "server-only";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_NETWORK, networkInfo, parseNetwork, type NetworkInfo, type ZcashNetwork } from "@/lib/network";

// The active Zcash network lives in settings.key = 'zcash_network' so an admin can switch it
// without a redeploy. Falls back to ZCASH_NETWORK (env) if unset or if the database is unreachable.
const KEY = "zcash_network";
const TAG = "network";

const readStored = unstable_cache(
  async (): Promise<ZcashNetwork | null> => {
    const { data, error } = await createAdminClient().from("settings").select("value").eq("key", KEY).maybeSingle();
    if (error) throw new Error(error.message);
    return parseNetwork(data?.value);
  },
  ["active-network"],
  { revalidate: 30, tags: [TAG] },
);

export async function getNetwork(): Promise<ZcashNetwork> {
  try {
    return (await readStored()) ?? DEFAULT_NETWORK;
  } catch (err) {
    console.error("[network] could not read active network, using default:", err instanceof Error ? err.message : err);
    return DEFAULT_NETWORK;
  }
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  return networkInfo(await getNetwork());
}

export async function setNetwork(network: ZcashNetwork): Promise<void> {
  const { error } = await createAdminClient()
    .from("settings")
    .upsert({ key: KEY, value: network, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidateTag(TAG);
  revalidateTag("impact");
  revalidatePath("/", "layout");
}
