import "server-only";
import { NextResponse } from "next/server";
import type { ZodError, ZodType, ZodTypeDef } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export interface ApiErrorBody {
  error: string;
  fields?: Record<string, string>;
}

export function jsonError(status: number, error: string, fields?: Record<string, string>) {
  const body: ApiErrorBody = fields ? { error, fields } : { error };
  return NextResponse.json(body, { status });
}

function zodFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export async function parseJson<T>(request: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const fields = zodFields(result.error);
    const first = Object.values(fields)[0] ?? "Please check the form and try again.";
    throw new ApiError(422, first, fields);
  }
  return result.data;
}

// Wraps a route handler so thrown ApiErrors become clean JSON responses
// and unexpected errors never leak internals.
export function withApi<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) return jsonError(err.status, err.message, err.fields);
      console.error("[api] unexpected error", err);
      return jsonError(500, "Something went wrong on our side. Please try again.");
    }
  };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
