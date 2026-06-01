import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { canAccessPath } from "@/lib/rbac";
import type { RoleSlug } from "@/types";

const ACCESS_COOKIE = "dm_access";
const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || "");

async function readRole(token?: string): Promise<RoleSlug | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.role as RoleSlug) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const role = await readRole(token);

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!canAccessPath(role, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except auth APIs, the login page, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|.*\\..*).*)"],
};
