"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySuperadminPassword } from "@/lib/superadmin";
import { registerClinic } from "@/lib/auth";
import { createSuperadminSession, deleteSuperadminSession } from "@/lib/session";
import { requireSuperadmin } from "@/lib/dal";

const SuperadminLoginSchema = z.object({
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});

export type SuperadminLoginFormState =
  | { message?: string }
  | undefined;

export async function superadminLoginAction(
  _prevState: SuperadminLoginFormState,
  formData: FormData
): Promise<SuperadminLoginFormState> {
  const validated = SuperadminLoginSchema.safeParse({
    password: formData.get("password"),
  });
  if (!validated.success) {
    return { message: "رمز عبور را وارد کنید." };
  }

  if (!verifySuperadminPassword(validated.data.password)) {
    return { message: "رمز عبور نادرست است." };
  }

  await createSuperadminSession();
  redirect("/superadmin");
}

export async function superadminLogoutAction() {
  await deleteSuperadminSession();
  redirect("/superadmin/login");
}

const CreateClinicSchema = z.object({
  clinicName: z.string().trim().min(2, "نام کلینیک باید حداقل ۲ حرف باشد."),
  adminName: z.string().trim().min(2, "نام مدیر باید حداقل ۲ حرف باشد."),
  adminEmail: z.email("ایمیل معتبر وارد کنید."),
  adminPassword: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد."),
});

export type CreateClinicFormState =
  | {
      errors?: Partial<
        Record<keyof z.infer<typeof CreateClinicSchema>, string[]>
      >;
      message?: string;
      success?: string;
    }
  | undefined;

export async function createClinicAction(
  _prevState: CreateClinicFormState,
  formData: FormData
): Promise<CreateClinicFormState> {
  await requireSuperadmin();

  const validated = CreateClinicSchema.safeParse({
    clinicName: formData.get("clinicName"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const result = await registerClinic(validated.data);
  if (!result.ok) {
    return { message: "این ایمیل قبلاً برای یک حساب دیگر استفاده شده است." };
  }

  revalidatePath("/superadmin");
  return {
    success: `کلینیک «${validated.data.clinicName}» ساخته شد. اطلاعات ورود را به مدیر کلینیک بدهید: ${validated.data.adminEmail}`,
  };
}
