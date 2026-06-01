import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const ok = (data: unknown, status = 200) => NextResponse.json({ data }, { status });
export const created = (data: unknown) => NextResponse.json({ data }, { status: 201 });
export const noContent = () => new NextResponse(null, { status: 204 });

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Wrap a route handler so thrown ApiError / ZodError become clean JSON responses.
export function handle<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.message, e.status);
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", issues: e.flatten().fieldErrors },
          { status: 422 }
        );
      }
      console.error("[api] unhandled error:", e);
      return fail("Internal server error", 500);
    }
  };
}

// Build a partial UPDATE SET clause from defined columns (skips undefined).
export function buildUpdate(cols: Record<string, unknown>): { setSql: string; values: unknown[] } {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [col, val] of Object.entries(cols)) {
    if (val !== undefined) {
      sets.push(`${col} = $${sets.length + 1}`);
      values.push(val);
    }
  }
  return { setSql: sets.join(", "), values };
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}
