import { handle, ok, fail } from "@/lib/api";
import { refreshSession } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = handle(async () => {
  const user = await refreshSession();
  if (!user) return fail("Could not refresh session", 401);
  return ok({ user });
});
