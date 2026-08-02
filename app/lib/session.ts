import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "session";
const SUPERADMIN_COOKIE = "superadmin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SUPERADMIN_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  staffId: string;
  clinicId: string;
  role: "ADMIN" | "RECEPTIONIST";
};

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function createSuperadminSession() {
  const expiresAt = new Date(Date.now() + SUPERADMIN_SESSION_DURATION_MS);
  const token = await new SignJWT({ role: "SUPERADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SUPERADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function isSuperadminSessionValid(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPERADMIN_COOKIE)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload.role === "SUPERADMIN";
  } catch {
    return false;
  }
}

export async function deleteSuperadminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPERADMIN_COOKIE);
}
