// frontend-owner/middleware.ts
//
// Server-side gate for the platform-owner console. Every protected
// route requires the kronos_auth cookie AND role=owner in the JWT
// payload. Signature is not verified here — the backend re-validates
// on every request.
import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "kronos_auth";

type JwtClaims = {
  sub?: string;
  role?: "owner" | "admin" | "employee";
  exp?: number;
};

function decodeJwtClaims(token: string): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

function isExpired(claims: JwtClaims): boolean {
  return typeof claims.exp === "number" && claims.exp * 1000 < Date.now();
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const loginUrl = new URL("/login", req.url);

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  const claims = decodeJwtClaims(token);
  if (!claims || isExpired(claims) || claims.role !== "owner") {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api|_next|favicon.ico|public|.*\\..*).*)"],
};
