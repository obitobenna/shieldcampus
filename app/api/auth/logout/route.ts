import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export const POST = withApi(async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
});
