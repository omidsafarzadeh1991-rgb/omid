import "server-only";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";
const BCRYPT_ROUNDS = 12;

export type RegisterClinicInput = {
  clinicName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export type RegisterClinicResult =
  | { ok: true; clinicId: string; staffId: string }
  | { ok: false; reason: "EMAIL_TAKEN" };

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
          name: input.adminName,
          email: input.adminEmail.toLowerCase(),
          passwordHash,
          role: "OWNER",
        },
      });
      return { clinic, staff };
    });

    return { ok: true, clinicId: clinic.id, staffId: staff.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR
    ) {
      return { ok: false, reason: "EMAIL_TAKEN" };
    }
    throw error;
  }
}

export type CreateStaffInput = {
  clinicId: string;
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "RECEPTIONIST";
};

export type CreateStaffResult =
  | { ok: true; staffId: string }
  | { ok: false; reason: "EMAIL_TAKEN" };

export async function createStaffMember(
  input: CreateStaffInput
): Promise<CreateStaffResult> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const staff = await prisma.staffUser.create({
      data: {
        clinicId: input.clinicId,
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
      },
    });
    return { ok: true, staffId: staff.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR
    ) {
      return { ok: false, reason: "EMAIL_TAKEN" };
    }
    throw error;
  }
}

export type VerifyLoginResult =
  | {
      ok: true;
      staffId: string;
      clinicId: string;
      role: "OWNER" | "ADMIN" | "RECEPTIONIST";
    }
  | { ok: false };

export async function verifyLogin(
  email: string,
  password: string
): Promise<VerifyLoginResult> {
  const staff = await prisma.staffUser.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!staff) return { ok: false };

  const passwordMatches = await bcrypt.compare(password, staff.passwordHash);
  if (!passwordMatches) return { ok: false };

  return {
    ok: true,
    staffId: staff.id,
    clinicId: staff.clinicId,
    role: staff.role,
  };
}
