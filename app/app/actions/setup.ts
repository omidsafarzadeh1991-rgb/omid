"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifySetupPassword, isSetupComplete } from "@/lib/setup";
import { registerClinic } from "@/lib/auth";
import { createSession } from "@/lib/session";

const SetupSchema = z.object({
  setupPassword: z.string().min(1, "رمز راه‌اندازی را وارد کنید."),
  clinicName: z.string().trim().min(2, "نام کلینیک باید حداقل ۲ حرف باشد."),
  adminName: z.string().trim().min(2, "نام مدیر باید حداقل ۲ حرف باشد."),
  adminEmail: z.email("ایمیل معتبر وارد کنید."),
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
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (!verifySetupPassword(validated.data.setupPassword)) {
    return { message: "رمز راه‌اندازی نادرست است." };
  }

  const result = await registerClinic(validated.data);
  if (!result.ok) {
    return { message: "این ایمیل قبلاً برای یک حساب دیگر استفاده شده است." };
  }

  await createSession({
    staffId: result.staffId,
    clinicId: result.clinicId,
    role: "OWNER",
  });

  redirect("/dashboard");
}
