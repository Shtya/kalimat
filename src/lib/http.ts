import "server-only";
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import { clientIp, rateLimit } from "./rate-limit";

export const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * Shared guard for JSON API routes: same-origin check (CSRF), per-IP rate limit,
 * body size cap and zod validation. Returns either parsed data or an error response.
 */
export async function guard<T>(
  req: Request,
  opts: { name: string; limit: number; windowMs: number; schema: ZodSchema<T> },
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  const origin = req.headers.get("origin");
  if (origin && safeHost(origin) !== req.headers.get("host")) {
    return { error: json({ error: "forbidden" }, 403) };
  }
  const rl = rateLimit(`${opts.name}:${clientIp(req.headers)}`, opts.limit, opts.windowMs);
  if (!rl.ok) return { error: json({ error: "rate_limited" }, 429, { "retry-after": String(rl.retryAfter) }) };

  const text = await req.text();
  if (text.length > 4_000) return { error: json({ error: "too_large" }, 413) };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { error: json({ error: "invalid_json" }, 400) };
  }
  const parsed = opts.schema.safeParse(body);
  if (!parsed.success) {
    return { error: json({ error: "invalid", issues: parsed.error.issues.map((i) => i.message) }, 400) };
  }
  return { data: parsed.data };
}
