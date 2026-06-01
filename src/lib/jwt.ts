import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import type { AccessClaims, RefreshClaims } from "@/types";

const accessKey = new TextEncoder().encode(env.jwt.accessSecret);
const refreshKey = new TextEncoder().encode(env.jwt.refreshSecret);

export async function signAccess(claims: AccessClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.jwt.accessTtl)
    .sign(accessKey);
}

export async function signRefresh(claims: RefreshClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.jwt.refreshTtl)
    .sign(refreshKey);
}

export async function verifyAccess(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, accessKey);
    return payload as unknown as AccessClaims;
  } catch {
    return null;
  }
}

export async function verifyRefresh(token: string): Promise<RefreshClaims | null> {
  try {
    const { payload } = await jwtVerify(token, refreshKey);
    return payload as unknown as RefreshClaims;
  } catch {
    return null;
  }
}
