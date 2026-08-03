import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const CHANGE_PASSWORD_PATH = "/dashboard/change-password";

/**
 * Used by every protected page/action. Also enforces a pending forced
 * password change here, in one place, so it can't be bypassed by just
 * navigating past the post-login redirect.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const staff = await prisma.staffUser.findUnique({
    where: { id: session.staffId },
    select: { mustChangePassword: true },
  });
  if (staff?.mustChangePassword) {
    redirect(CHANGE_PASSWORD_PATH);
  }

  return session;
}

/** Only for the change-password page itself, so it isn't redirected to itself. */
export async function requireSessionAllowingPasswordChange(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/** For pages/actions reserved for the single per-install OWNER account. */
export async function requireOwner(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "OWNER") {
    redirect("/dashboard");
  }
  return session;
}
