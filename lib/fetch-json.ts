// Client-side JSON fetch that turns API errors into a typed result instead of throwing.
export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; fields?: Record<string, string> };

export async function fetchJson<T>(input: string, init?: RequestInit & { json?: unknown }): Promise<FetchResult<T>> {
  const { json, headers, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(input, {
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    return { ok: false, status: 0, error: "You appear to be offline. Check your connection and try again." };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const b = (body ?? {}) as { error?: unknown; fields?: unknown };
    return {
      ok: false,
      status: res.status,
      error: typeof b.error === "string" ? b.error : "Something went wrong. Please try again.",
      fields: b.fields && typeof b.fields === "object" ? (b.fields as Record<string, string>) : undefined,
    };
  }
  return { ok: true, data: body as T };
}
