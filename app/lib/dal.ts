import "server-only";
import { redirect } from "next/navigation";
import {
  getSession,
  isSuperadminSessionValid,
  type SessionPayload,
} from "@/lib/session";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireSuperadmin(): Promise<void> {
  const ok = await isSuperadminSessionValid();
  if (!ok) {
    redirect("/superadmin/login");
  }
}
