import { handle, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getEntitledOptions, getGrantedOptions } from "@/lib/options";

export const runtime = "nodejs";

// Employees see only their own grants; admins compose within the company's entitlement.
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  if (user.roleSlug === "user") return ok(await getGrantedOptions(user.id));
  const qp = new URL(req.url).searchParams.get("companyId");
  const companyId = user.roleSlug === "super_admin" ? (qp ? Number(qp) : null) : user.companyId;
  if (!companyId) throw new ApiError("Select a company first", 400);
  return ok(await getEntitledOptions(companyId));
});
