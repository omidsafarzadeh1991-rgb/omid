"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifySetupPassword, isSetupComplete } from "@/lib/setup";
import { registerClinic } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { isRateLimited } from "@/lib/rate-limit";

const SETUP_ATTEMPT_LIMIT = 5;
const SETUP_ATTEMPT_WINDOW_MS = 15 * 60_000;

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

const SetupSchema = z.object({
  setupPassword: z.string().min(1, "رمز راه‌اندازی را وارد کنید."),
  clinicName: z.string().trim().min(2, "نام کلینیک باید حداقل ۲ حرف باشد."),
  adminName: z.string().trim().min(2, "نام مدیر باید حداقل ۲ حرف باشد."),
  adminUsername: z
    .string()
    .trim()
    .min(3, "نام کاربری باید حداقل ۳ کاراکتر باشد.")
    .regex(USERNAME_PATTERN, "نام کاربری فقط می‌تواند حروف انگلیسی، عدد، نقطه، خط تیره و آندرلاین داشته باشد."),
  adminEmail: z.union([z.email("ایمیل معتبر وارد کنید."), z.literal("")]).optional(),
  adminPassword: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد."),
});

export type SetupFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof SetupSchema>, string[]>>;
      message?: string;
    }
  | undefined;

export async function setupAction(
  _prevState: SetupFormState,
  formData: FormData
): Promise<SetupFormState> {
  if (await isSetupComplete()) {
    redirect("/login");
  }

  const validated = SetupSchema.safeParse({
    setupPassword: formData.get("setupPassword"),
    clinicName: formData.get("clinicName"),
    adminName: formData.get("adminName"),
    adminUsername: formData.get("adminUsername"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (isRateLimited("setup", SETUP_ATTEMPT_LIMIT, SETUP_ATTEMPT_WINDOW_MS)) {
    return { message: "تعداد تلاش‌های راه‌اندازی بیش از حد مجاز است؛ چند دقیقه دیگر دوباره امتحان کنید." };
  }

  if (!verifySetupPassword(validated.data.setupPassword)) {
    return { message: "رمز راه‌اندازی نادرست است." };
  }

  const result = await registerClinic({
    clinicName: validated.data.clinicName,
    adminUsername: validated.data.adminUsername,
    adminFirstName: validated.data.adminName,
    adminEmail: validated.data.adminEmail || undefined,
    adminPassword: validated.data.adminPassword,
  });
  if (!result.ok) {
    return {
      message:
        result.reason === "USERNAME_TAKEN"
          ? "این نام کاربری قبلاً استفاده شده است."
          : "این ایمیل قبلاً برای یک حساب دیگر استفاده شده است.",
    };
  }

  await createSession({
    staffId: result.staffId,
    clinicId: result.clinicId,
    role: "OWNER",
  });

  redirect("/dashboard");
}
