"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { createStaffMember } from "@/lib/auth";
import { WEEK_DAYS } from "@/lib/weekdays";
import { toEnglishDigits } from "@/lib/format";
import { canManageClinic } from "@/lib/roles";
import { saveStaffAvatar } from "@/lib/staff-avatar";

const BCRYPT_ROUNDS = 12;
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

function parseOptionalDate(value: FormDataEntryValue | null): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function uploadedAvatarUrl(formData: FormData): Promise<string | undefined | { error: string }> {
  const file = formData.get("profilePicture");
  if (!(file instanceof File) || file.size === 0) return undefined;

  const result = await saveStaffAvatar(file);
  if (!result.ok) return { error: result.message };
  return result.url;
}

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

const UpdateServiceSchema = z.object({
  serviceId: z.string().min(1),
  name: z.string().trim().min(1, "نام خدمت را وارد کنید."),
  price: z.string().optional(),
});

export type UpdateServiceFormState = { message?: string } | undefined;

export async function updateServiceAction(
  _prevState: UpdateServiceFormState,
  formData: FormData
): Promise<UpdateServiceFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    return { message: "فقط مدیر کلینیک می‌تواند خدمت را ویرایش کند." };
  }

  const validated = UpdateServiceSchema.safeParse({
    serviceId: formData.get("serviceId"),
    name: formData.get("name"),
    price: formData.get("price"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "نام خدمت نامعتبر است." };
  }

  const service = await prisma.service.findFirst({
    where: { id: validated.data.serviceId, clinicId: session.clinicId },
  });
  if (!service) return { message: "خدمت پیدا نشد." };

  const priceDigits = toEnglishDigits(validated.data.price ?? "").replace(/[^\d]/g, "");
  const price = priceDigits ? Number(priceDigits) : null;

  try {
    await prisma.service.update({
      where: { id: service.id },
      data: { name: validated.data.name, price },
    });
  } catch {
    return { message: "خدمتی با این نام قبلاً در فهرست تعریف شده است." };
  }

  revalidatePath("/dashboard/doctors");
}

export async function toggleServiceActiveAction(serviceId: string) {
  const session = await requireSession();
  if (!canManageClinic(session.role)) return;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, clinicId: session.clinicId },
  });
  if (!service) return;

  await prisma.service.update({
    where: { id: service.id },
    data: { active: !service.active },
  });

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
  username: z
    .string()
    .trim()
    .min(3, "نام کاربری باید حداقل ۳ کاراکتر باشد.")
    .regex(USERNAME_PATTERN, "نام کاربری فقط می‌تواند حروف انگلیسی، عدد، نقطه، خط تیره و آندرلاین داشته باشد."),
  firstName: z.string().trim().min(2, "نام باید حداقل ۲ حرف باشد."),
  lastName: z.string().trim().optional(),
  email: z.union([z.email("ایمیل معتبر وارد کنید."), z.literal("")]).optional(),
  mobile: z.string().trim().optional(),
  personnelCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
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
    username: formData.get("username"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    email: formData.get("email"),
    mobile: formData.get("mobile") || undefined,
    personnelCode: formData.get("personnelCode") || undefined,
    notes: formData.get("notes") || undefined,
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const avatar = await uploadedAvatarUrl(formData);
  if (avatar && typeof avatar === "object") {
    return { message: avatar.error };
  }

  const result = await createStaffMember({
    clinicId: session.clinicId,
    username: validated.data.username,
    firstName: validated.data.firstName,
    lastName: validated.data.lastName,
    email: validated.data.email || undefined,
    mobile: validated.data.mobile,
    birthDate: parseOptionalDate(formData.get("birthDate")),
    personnelCode: validated.data.personnelCode,
    hireDate: parseOptionalDate(formData.get("hireDate")),
    notes: validated.data.notes,
    profilePictureUrl: avatar,
    password: validated.data.password,
    role: validated.data.role,
    mustChangePassword: formData.get("mustChangePassword") === "on",
  });
  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      USERNAME_TAKEN: "این نام کاربری قبلاً استفاده شده است.",
      EMAIL_TAKEN: "این ایمیل قبلاً برای یک حساب دیگر استفاده شده است.",
      PERSONNEL_CODE_TAKEN: "این کد پرسنلی قبلاً استفاده شده است.",
    };
    return { message: messages[result.reason] };
  }

  revalidatePath("/dashboard/staff");
  return { success: `کاربر «${validated.data.firstName}» با موفقیت اضافه شد.` };
}

const UpdateStaffSchema = z.object({
  staffId: z.string().min(1),
  firstName: z.string().trim().min(2, "نام باید حداقل ۲ حرف باشد."),
  lastName: z.string().trim().optional(),
  email: z.union([z.email("ایمیل معتبر وارد کنید."), z.literal("")]).optional(),
  mobile: z.string().trim().optional(),
  personnelCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  role: z.enum(["ADMIN", "RECEPTIONIST"]),
});

export type UpdateStaffFormState = { message?: string; success?: string } | undefined;

export async function updateStaffAction(
  _prevState: UpdateStaffFormState,
  formData: FormData
): Promise<UpdateStaffFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    return { message: "فقط مدیر کلینیک می‌تواند اطلاعات کارمند را ویرایش کند." };
  }

  const validated = UpdateStaffSchema.safeParse({
    staffId: formData.get("staffId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    email: formData.get("email"),
    mobile: formData.get("mobile") || undefined,
    personnelCode: formData.get("personnelCode") || undefined,
    notes: formData.get("notes") || undefined,
    role: formData.get("role"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  }

  const staff = await prisma.staffUser.findFirst({
    where: { id: validated.data.staffId, clinicId: session.clinicId },
  });
  if (!staff) return { message: "کارمند پیدا نشد." };
  if (staff.role === "OWNER") {
    return { message: "اطلاعات مالک سامانه از این بخش قابل ویرایش نیست." };
  }

  const avatar = await uploadedAvatarUrl(formData);
  if (avatar && typeof avatar === "object") {
    return { message: avatar.error };
  }

  try {
    await prisma.staffUser.update({
      where: { id: staff.id },
      data: {
        firstName: validated.data.firstName,
        lastName: validated.data.lastName || null,
        email: validated.data.email || null,
        mobile: validated.data.mobile || null,
        birthDate: parseOptionalDate(formData.get("birthDate")) ?? null,
        personnelCode: validated.data.personnelCode || null,
        hireDate: parseOptionalDate(formData.get("hireDate")) ?? null,
        notes: validated.data.notes || null,
        role: validated.data.role,
        ...(avatar ? { profilePictureUrl: avatar } : {}),
      },
    });
  } catch {
    return { message: "این ایمیل یا کد پرسنلی قبلاً برای یک حساب دیگر استفاده شده است." };
  }

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staff.id}`);
  return { success: "اطلاعات کارمند به‌روزرسانی شد." };
}

export async function toggleStaffActiveAction(staffId: string) {
  const session = await requireSession();
  if (!canManageClinic(session.role)) return;

  const staff = await prisma.staffUser.findFirst({
    where: { id: staffId, clinicId: session.clinicId },
  });
  if (!staff || staff.role === "OWNER") return;

  await prisma.staffUser.update({
    where: { id: staff.id },
    data: { active: !staff.active },
  });

  revalidatePath("/dashboard/staff");
}

const ResetStaffPasswordSchema = z.object({
  staffId: z.string().min(1),
  newPassword: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد."),
});

export type ResetStaffPasswordFormState = { message?: string; success?: string } | undefined;

export async function resetStaffPasswordAction(
  _prevState: ResetStaffPasswordFormState,
  formData: FormData
): Promise<ResetStaffPasswordFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    return { message: "فقط مدیر کلینیک می‌تواند رمز عبور کارمند را تغییر دهد." };
  }

  const validated = ResetStaffPasswordSchema.safeParse({
    staffId: formData.get("staffId"),
    newPassword: formData.get("newPassword"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "رمز عبور نامعتبر است." };
  }

  const staff = await prisma.staffUser.findFirst({
    where: { id: validated.data.staffId, clinicId: session.clinicId },
  });
  if (!staff) return { message: "کارمند پیدا نشد." };
  if (staff.role === "OWNER") {
    return { message: "رمز عبور مالک سامانه از این بخش قابل تغییر نیست." };
  }

  const passwordHash = await bcrypt.hash(validated.data.newPassword, BCRYPT_ROUNDS);
  await prisma.staffUser.update({
    where: { id: staff.id },
    data: {
      passwordHash,
      mustChangePassword: formData.get("mustChangePassword") === "on",
    },
  });

  return { success: "رمز عبور جدید ثبت شد." };
}
