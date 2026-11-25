import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// Middleware must never hang: Vercel kills it (504 MIDDLEWARE_INVOCATION_TIMEOUT) if Supabase
// is slow, paused or unreachable. Any auth call here gets a hard deadline.
const AUTH_TIMEOUT_MS = 3000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(AUTH_TIMEOUT_MS);
  const signal =
    init?.signal && typeof AbortSignal.any === "function" ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

// Refreshes the auth session cookie on every request.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return response;

  // No Supabase auth cookie means there is no session to refresh, so skip the network call.
  const hasSession = request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  if (!hasSession) return response;

  const supabase = createServerClient<Database>(url, anonKey, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Do not remove: getUser() validates the token and triggers the refresh.
  // If Supabase does not answer in time, let the request through; pages re-check auth themselves.
  try {
    await supabase.auth.getUser();
  } catch {
    // Timed out or network error: serve the page rather than a 504.
  }
  return response;
}
