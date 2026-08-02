"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { createStaffMember } from "@/lib/auth";

const CreateDoctorSchema = z.object({
  name: z.string().trim().min(2, "نام پزشک باید حداقل ۲ حرف باشد."),
  workStartHour: z.coerce.number().int().min(0).max(23),
  workEndHour: z.coerce.number().int().min(1).max(24),
  slotMinutes: z.coerce.number().int().min(5).max(240),
  workDays: z
    .array(z.coerce.number().int().min(0).max(6))
    .min(1, "حداقل یک روز کاری را انتخاب کنید."),
  services: z.string().optional(),
});

export type CreateDoctorFormState =
  | {
      errors?: Partial<
        Record<keyof z.infer<typeof CreateDoctorSchema>, string[]>
      >;
      message?: string;
    }
  | undefined;

export async function createDoctorAction(
  _prevState: CreateDoctorFormState,
  formData: FormData
): Promise<CreateDoctorFormState> {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    return { message: "فقط مدیر کلینیک می‌تواند پزشک اضافه کند." };
  }

  const validated = CreateDoctorSchema.safeParse({
    name: formData.get("name"),
    workStartHour: formData.get("workStartHour"),
    workEndHour: formData.get("workEndHour"),
    slotMinutes: formData.get("slotMinutes"),
    workDays: formData.getAll("workDays"),
    services: formData.get("services"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (validated.data.workEndHour <= validated.data.workStartHour) {
    return { message: "ساعت پایان باید بعد از ساعت شروع باشد." };
  }

  const serviceNames = (validated.data.services ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  await prisma.$transaction(async (tx) => {
    const doctor = await tx.doctor.create({
      data: {
        clinicId: session.clinicId,
        name: validated.data.name,
        workStartMin: validated.data.workStartHour * 60,
        workEndMin: validated.data.workEndHour * 60,
        slotMinutes: validated.data.slotMinutes,
        workDays: validated.data.workDays.join(","),
      },
    });

    if (serviceNames.length > 0) {
      await tx.service.createMany({
        data: serviceNames.map((name) => ({
          clinicId: session.clinicId,
          doctorId: doctor.id,
          name,
        })),
      });
    }
  });

  revalidatePath("/dashboard/doctors");
  revalidatePath("/dashboard");
}

const CreateStaffSchema = z.object({
  name: z.string().trim().min(2, "نام باید حداقل ۲ حرف باشد."),
  email: z.email("ایمیل معتبر وارد کنید."),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد."),
  role: z.enum(["ADMIN", "RECEPTIONIST"]),
});

export type CreateStaffFormState =
  | {
      errors?: Partial<Record<keyof z.infer<typeof CreateStaffSchema>, string[]>>;
      message?: string;
      success?: string;
    }
  | undefined;

export async function createStaffAction(
  _prevState: CreateStaffFormState,
  formData: FormData
): Promise<CreateStaffFormState> {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    return { message: "فقط مدیر کلینیک می‌تواند کارمند اضافه کند." };
  }

  const validated = CreateStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const result = await createStaffMember({
    clinicId: session.clinicId,
    name: validated.data.name,
    email: validated.data.email,
    password: validated.data.password,
    role: validated.data.role,
  });
  if (!result.ok) {
    return { message: "این ایمیل قبلاً برای یک حساب دیگر استفاده شده است." };
  }

  revalidatePath("/dashboard/staff");
  return { success: `کاربر «${validated.data.name}» با موفقیت اضافه شد.` };
}
