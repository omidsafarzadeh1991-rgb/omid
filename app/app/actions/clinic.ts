"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { createStaffMember } from "@/lib/auth";
import { WEEK_DAYS } from "@/lib/weekdays";
import { toEnglishDigits } from "@/lib/format";
import { canManageClinic } from "@/lib/roles";

const CreateDoctorSchema = z.object({
  name: z.string().trim().min(2, "نام پزشک باید حداقل ۲ حرف باشد."),
  slotMinutes: z.coerce.number().int().min(5).max(240),
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
  if (!canManageClinic(session.role)) {
    return { message: "فقط مدیر کلینیک می‌تواند پزشک اضافه کند." };
  }

  const validated = CreateDoctorSchema.safeParse({
    name: formData.get("name"),
    slotMinutes: formData.get("slotMinutes"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const schedules: { dayOfWeek: number; startMin: number; endMin: number }[] = [];
  for (const day of WEEK_DAYS) {
    if (!formData.get(`day_${day.value}_enabled`)) continue;

    const startHour = Number(formData.get(`day_${day.value}_start`));
    const endHour = Number(formData.get(`day_${day.value}_end`));
    if (
      !Number.isFinite(startHour) ||
      !Number.isFinite(endHour) ||
      endHour <= startHour
    ) {
      return {
        message: `ساعت‌های روز ${day.label} نامعتبر است (ساعت پایان باید بعد از ساعت شروع باشد).`,
      };
    }
    schedules.push({
      dayOfWeek: day.value,
      startMin: startHour * 60,
      endMin: endHour * 60,
    });
  }

  if (schedules.length === 0) {
    return { message: "حداقل یک روز کاری را انتخاب کنید." };
  }

  const serviceIds = formData.getAll("serviceIds").map(String);
  const specialtyIds = formData.getAll("specialtyIds").map(String);

  const [validServices, validSpecialties] = await Promise.all([
    prisma.service.findMany({
      where: { id: { in: serviceIds }, clinicId: session.clinicId },
      select: { id: true },
    }),
    prisma.specialty.findMany({
      where: { id: { in: specialtyIds }, clinicId: session.clinicId },
      select: { id: true },
    }),
  ]);

  await prisma.doctor.create({
    data: {
      clinicId: session.clinicId,
      name: validated.data.name,
      slotMinutes: validated.data.slotMinutes,
      schedules: { create: schedules },
      services: { connect: validServices.map((s) => ({ id: s.id })) },
      specialties: { connect: validSpecialties.map((s) => ({ id: s.id })) },
    },
  });

  revalidatePath("/dashboard/doctors");
  revalidatePath("/dashboard");
}

export async function updateDoctorCatalogAction(
  doctorId: string,
  serviceIds: string[],
  specialtyIds: string[]
) {
  const session = await requireSession();
  if (!canManageClinic(session.role)) return;

  const doctor = await prisma.doctor.findFirst({
    where: { id: doctorId, clinicId: session.clinicId },
  });
  if (!doctor) return;

  const [validServices, validSpecialties] = await Promise.all([
    prisma.service.findMany({
      where: { id: { in: serviceIds }, clinicId: session.clinicId },
      select: { id: true },
    }),
    prisma.specialty.findMany({
      where: { id: { in: specialtyIds }, clinicId: session.clinicId },
      select: { id: true },
    }),
  ]);

  await prisma.doctor.update({
    where: { id: doctorId },
    data: {
      services: { set: validServices.map((s) => ({ id: s.id })) },
      specialties: { set: validSpecialties.map((s) => ({ id: s.id })) },
    },
  });

  revalidatePath("/dashboard/doctors");
}

const CreateServiceSchema = z.object({
  name: z.string().trim().min(1, "نام خدمت را وارد کنید."),
  price: z.string().optional(),
});

export type CreateServiceFormState = { message?: string } | undefined;

export async function createServiceAction(
  _prevState: CreateServiceFormState,
  formData: FormData
): Promise<CreateServiceFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    return { message: "فقط مدیر کلینیک می‌تواند خدمت اضافه کند." };
  }

  const validated = CreateServiceSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "نام خدمت نامعتبر است." };
  }

  const priceDigits = toEnglishDigits(validated.data.price ?? "").replace(/[^\d]/g, "");
  const price = priceDigits ? Number(priceDigits) : null;

  try {
    await prisma.service.create({
      data: { clinicId: session.clinicId, name: validated.data.name, price },
    });
  } catch {
    return { message: "این خدمت قبلاً در فهرست تعریف شده است." };
  }

  revalidatePath("/dashboard/doctors");
}

const CreateSpecialtySchema = z.object({
  name: z.string().trim().min(1, "نام تخصص را وارد کنید."),
});

export type CreateSpecialtyFormState = { message?: string } | undefined;

export async function createSpecialtyAction(
  _prevState: CreateSpecialtyFormState,
  formData: FormData
): Promise<CreateSpecialtyFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    return { message: "فقط مدیر کلینیک می‌تواند تخصص اضافه کند." };
  }

  const validated = CreateSpecialtySchema.safeParse({ name: formData.get("name") });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "نام تخصص نامعتبر است." };
  }

  try {
    await prisma.specialty.create({
      data: { clinicId: session.clinicId, name: validated.data.name },
    });
  } catch {
    return { message: "این تخصص قبلاً در فهرست تعریف شده است." };
  }

  revalidatePath("/dashboard/doctors");
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
  if (!canManageClinic(session.role)) {
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
