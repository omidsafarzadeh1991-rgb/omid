"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { registerClinic, verifyLogin } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";

const RegisterSchema = z.object({
  clinicName: z.string().trim().min(2, "نام کلینیک باید حداقل ۲ حرف باشد."),
  adminName: z.string().trim().min(2, "نام مدیر باید حداقل ۲ حرف باشد."),
  adminEmail: z.email("ایمیل معتبر وارد کنید."),
  adminPassword: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد."),
});

export type RegisterFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof RegisterSchema>, string[]>>;
      message?: string;
    }
  | undefined;

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const validated = RegisterSchema.safeParse({
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

  await createSession({
    staffId: result.staffId,
    clinicId: result.clinicId,
    role: "ADMIN",
  });

  redirect("/dashboard");
}

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

  const result = await verifyLogin(
    validated.data.email,
    validated.data.password
  );
  if (!result.ok) {
    return { message: "ایمیل یا رمز عبور نادرست است." };
  }

  await createSession({
    staffId: result.staffId,
    clinicId: result.clinicId,
    role: result.role,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
