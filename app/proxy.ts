import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/book"];
const AUTH_PAGES = ["/login"];

async function isValidToken(
  token: string | undefined,
  secret: string | undefined
): Promise<boolean> {
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.SESSION_SECRET;

  if (pathname.startsWith("/superadmin")) {
    if (pathname === "/superadmin/login") {
      const authenticated = await isValidToken(
        request.cookies.get("superadmin_session")?.value,
        secret
      );
      if (authenticated) {
        return NextResponse.redirect(new URL("/superadmin", request.url));
      }
      return NextResponse.next();
    }

    const authenticated = await isValidToken(
      request.cookies.get("superadmin_session")?.value,
      secret
    );
    if (!authenticated) {
      return NextResponse.redirect(new URL("/superadmin/login", request.url));
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPage = AUTH_PAGES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected && !isAuthPage) {
    return NextResponse.next();
  }

  const authenticated = await isValidToken(
    request.cookies.get("session")?.value,
    secret
  );

  if (isProtected && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/book/:path*",
    "/login",
    "/superadmin",
    "/superadmin/:path*",
  ],
};
