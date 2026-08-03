import "server-only";
import bcrypt from "bcryptjs";
import { Prisma, type StaffRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";
const BCRYPT_ROUNDS = 12;

type UniqueField = "username" | "email" | "personnelCode";

/**
 * The better-sqlite3 driver adapter doesn't populate the standard
 * `meta.target`; the violated column shows up nested under
 * `meta.driverAdapterError.cause.constraint.fields` instead.
 */
function uniqueConstraintField(error: unknown): UniqueField | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== PRISMA_UNIQUE_CONSTRAINT_ERROR
  ) {
    return null;
  }

  const meta = error.meta as
    | { target?: unknown; driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } } }
    | undefined;

  const target = meta?.target;
  const adapterFields = meta?.driverAdapterError?.cause?.constraint?.fields;
  const fields = Array.isArray(target) ? target : Array.isArray(adapterFields) ? adapterFields : [];
  const field = fields[0];

  if (field === "username" || field === "email" || field === "personnelCode") {
    return field;
  }
  return null;
}

export type RegisterClinicInput = {
  clinicName: string;
  adminUsername: string;
  adminFirstName: string;
  adminEmail?: string;
  adminPassword: string;
};

export type RegisterClinicResult =
  | { ok: true; clinicId: string; staffId: string }
  | { ok: false; reason: "USERNAME_TAKEN" | "EMAIL_TAKEN" };

export async function registerClinic(
  input: RegisterClinicInput
): Promise<RegisterClinicResult> {
  const passwordHash = await bcrypt.hash(input.adminPassword, BCRYPT_ROUNDS);

  try {
    const { clinic, staff } = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: { name: input.clinicName },
      });
      const staff = await tx.staffUser.create({
        data: {
          clinicId: clinic.id,
          username: input.adminUsername.toLowerCase(),
          firstName: input.adminFirstName,
          email: input.adminEmail?.toLowerCase() || null,
          passwordHash,
          role: "OWNER",
        },
      });
      return { clinic, staff };
    });

    return { ok: true, clinicId: clinic.id, staffId: staff.id };
  } catch (error) {
    const field = uniqueConstraintField(error);
    if (field === "username") return { ok: false, reason: "USERNAME_TAKEN" };
    if (field === "email") return { ok: false, reason: "EMAIL_TAKEN" };
    throw error;
  }
}

export type CreateStaffInput = {
  clinicId: string;
  username: string;
  firstName: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  birthDate?: Date;
  personnelCode?: string;
  hireDate?: Date;
  notes?: string;
  profilePictureUrl?: string;
  password: string;
  role: "ADMIN" | "RECEPTIONIST";
  mustChangePassword?: boolean;
};

export type CreateStaffResult =
  | { ok: true; staffId: string }
  | { ok: false; reason: "USERNAME_TAKEN" | "EMAIL_TAKEN" | "PERSONNEL_CODE_TAKEN" };

export async function createStaffMember(
  input: CreateStaffInput
): Promise<CreateStaffResult> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const staff = await prisma.staffUser.create({
      data: {
        clinicId: input.clinicId,
        username: input.username.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName || null,
        email: input.email?.toLowerCase() || null,
        mobile: input.mobile || null,
        birthDate: input.birthDate ?? null,
        personnelCode: input.personnelCode || null,
        hireDate: input.hireDate ?? null,
        notes: input.notes || null,
        profilePictureUrl: input.profilePictureUrl || null,
        passwordHash,
        role: input.role,
        mustChangePassword: input.mustChangePassword ?? true,
      },
    });
    return { ok: true, staffId: staff.id };
  } catch (error) {
    const field = uniqueConstraintField(error);
    if (field === "username") return { ok: false, reason: "USERNAME_TAKEN" };
    if (field === "email") return { ok: false, reason: "EMAIL_TAKEN" };
    if (field === "personnelCode") return { ok: false, reason: "PERSONNEL_CODE_TAKEN" };
    throw error;
  }
}

export type VerifyLoginResult =
  | {
      ok: true;
      staffId: string;
      clinicId: string;
      role: StaffRole;
      mustChangePassword: boolean;
    }
  | { ok: false; reason: "INVALID" | "INACTIVE" };

export async function verifyLogin(
  username: string,
  password: string
): Promise<VerifyLoginResult> {
  const staff = await prisma.staffUser.findUnique({
    where: { username: username.toLowerCase() },
  });
  if (!staff) return { ok: false, reason: "INVALID" };

  const passwordMatches = await bcrypt.compare(password, staff.passwordHash);
  if (!passwordMatches) {
    await prisma.staffUser.update({
      where: { id: staff.id },
      data: { failedLoginCount: { increment: 1 } },
    });
    return { ok: false, reason: "INVALID" };
  }

  if (!staff.active) {
    return { ok: false, reason: "INACTIVE" };
  }

  await prisma.staffUser.update({
    where: { id: staff.id },
    data: { failedLoginCount: 0 },
  });

  return {
    ok: true,
    staffId: staff.id,
    clinicId: staff.clinicId,
    role: staff.role,
    mustChangePassword: staff.mustChangePassword,
  };
}
