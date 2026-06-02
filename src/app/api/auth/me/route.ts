import { handle, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

// requireUser re-validates the user against the DB, so a removed account 401s here too.
export const GET = handle(async () => {
  const user = await requireUser();
  return ok({ user });
});
