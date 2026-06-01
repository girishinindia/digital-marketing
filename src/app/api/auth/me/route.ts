import { handle, ok, fail } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) return fail("Not authenticated", 401);
  return ok({ user });
});
