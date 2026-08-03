"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { verifyLogin } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";
import { requireSessionAllowingPasswordChange } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/security-log";
import { isRateLimited } from "@/lib/rate-limit";

// Per-username limit stops repeated guessing against one account; the
// coarser global limit stops someone sweeping through many different
// username guesses.
const LOGIN_LIMIT_PER_USERNAME = 5;
const LOGIN_LIMIT_GLOBAL = 30;
const LOGIN_WINDOW_MS = 5 * 60_000;
const BCRYPT_ROUNDS = 12;

const LoginSchema = z.object({
  username: z.string().trim().min(1, "نام کاربری را وارد کنید."),
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
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const usernameLimited = isRateLimited(
    `login:${validated.data.username.toLowerCase()}`,
    LOGIN_LIMIT_PER_USERNAME,
    LOGIN_WINDOW_MS
  );
  const globalLimited = isRateLimited("login:global", LOGIN_LIMIT_GLOBAL, LOGIN_WINDOW_MS);
  if (usernameLimited || globalLimited) {
    return { message: "تعداد تلاش‌های ورود بیش از حد مجاز است؛ چند دقیقه دیگر دوباره امتحان کنید." };
  }

  const result = await verifyLogin(validated.data.username, validated.data.password);
  if (!result.ok) {
    const clinic = await prisma.clinic.findFirst({ select: { id: true } });
    if (clinic) {
      await logSecurityEvent(clinic.id, "LOGIN_FAILED", validated.data.username);
    }
    if (result.reason === "INACTIVE") {
      return { message: "این حساب غیرفعال شده است؛ با مالک سامانه یا مدیر کلینیک تماس بگیرید." };
    }
    return { message: "نام کاربری یا رمز عبور نادرست است." };
  }

  await createSession({
    staffId: result.staffId,
    clinicId: result.clinicId,
    role: result.role,
  });
  await logSecurityEvent(
    result.clinicId,
    "LOGIN_SUCCESS",
    validated.data.username,
    result.staffId
  );

  redirect(result.mustChangePassword ? "/dashboard/change-password" : "/dashboard");
}

export async function logoutAction() {
  const session = await requireSessionAllowingPasswordChange();
  await logSecurityEvent(session.clinicId, "LOGOUT", undefined, session.staffId);
  await deleteSession();
  redirect("/login");
}

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "رمز عبور فعلی را وارد کنید."),
    newPassword: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد."),
    confirmPassword: z.string().min(1, "تکرار رمز عبور را وارد کنید."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "رمز عبور و تکرار آن یکسان نیستند.",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormState =
  | {
      errors?: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string[]>>;
      message?: string;
    }
  | undefined;

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData
): Promise<ChangePasswordFormState> {
  const session = await requireSessionAllowingPasswordChange();

  const validated = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const staff = await prisma.staffUser.findUniqueOrThrow({
    where: { id: session.staffId },
  });
  const currentMatches = await bcrypt.compare(validated.data.currentPassword, staff.passwordHash);
  if (!currentMatches) {
    return { message: "رمز عبور فعلی نادرست است." };
  }

  const passwordHash = await bcrypt.hash(validated.data.newPassword, BCRYPT_ROUNDS);
  await prisma.staffUser.update({
    where: { id: session.staffId },
    data: { passwordHash, mustChangePassword: false },
  });

  redirect("/dashboard");
}
