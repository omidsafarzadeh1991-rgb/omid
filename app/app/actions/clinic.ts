"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const CreateDoctorSchema = z.object({
  name: z.string().trim().min(2, "نام پزشک باید حداقل ۲ حرف باشد."),
  workStartHour: z.coerce.number().int().min(0).max(23),
  workEndHour: z.coerce.number().int().min(1).max(24),
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

  const validated = CreateDoctorSchema.safeParse({
    name: formData.get("name"),
    workStartHour: formData.get("workStartHour"),
    workEndHour: formData.get("workEndHour"),
    slotMinutes: formData.get("slotMinutes"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (validated.data.workEndHour <= validated.data.workStartHour) {
    return { message: "ساعت پایان باید بعد از ساعت شروع باشد." };
  }

  await prisma.doctor.create({
    data: {
      clinicId: session.clinicId,
      name: validated.data.name,
      workStartMin: validated.data.workStartHour * 60,
      workEndMin: validated.data.workEndHour * 60,
      slotMinutes: validated.data.slotMinutes,
    },
  });

  revalidatePath("/dashboard");
}
