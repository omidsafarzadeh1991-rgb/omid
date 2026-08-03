"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyLogin } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/security-log";
import { isRateLimited } from "@/lib/rate-limit";

// Per-email limit stops repeated guessing against one account; the coarser
// global limit stops someone sweeping through many different email guesses.
const LOGIN_LIMIT_PER_EMAIL = 5;
const LOGIN_LIMIT_GLOBAL = 30;
const LOGIN_WINDOW_MS = 5 * 60_000;

const LoginSchema = z.object({
  email: z.email("ایمیل معتبر وارد کنید."),
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});

export type LoginFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof LoginSchema>, string[]>>;
      message?: string;
    }
  | undefined;

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const emailLimited = isRateLimited(
    `login:${validated.data.email.toLowerCase()}`,
    LOGIN_LIMIT_PER_EMAIL,
    LOGIN_WINDOW_MS
  );
  const globalLimited = isRateLimited("login:global", LOGIN_LIMIT_GLOBAL, LOGIN_WINDOW_MS);
  if (emailLimited || globalLimited) {
    return { message: "تعداد تلاش‌های ورود بیش از حد مجاز است؛ چند دقیقه دیگر دوباره امتحان کنید." };
  }

  const result = await verifyLogin(
    validated.data.email,
    validated.data.password
  );
  if (!result.ok) {
    const clinic = await prisma.clinic.findFirst({ select: { id: true } });
    if (clinic) {
      await logSecurityEvent(clinic.id, "LOGIN_FAILED", validated.data.email);
    }
    return { message: "ایمیل یا رمز عبور نادرست است." };
  }

  await createSession({
    staffId: result.staffId,
    clinicId: result.clinicId,
    role: result.role,
  });
  await logSecurityEvent(
    result.clinicId,
    "LOGIN_SUCCESS",
    validated.data.email,
    result.staffId
  );

  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
