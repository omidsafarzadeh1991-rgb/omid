"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyLogin } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";

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
