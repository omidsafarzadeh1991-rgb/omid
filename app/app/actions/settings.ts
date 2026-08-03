"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { canManageClinic } from "@/lib/roles";
import { saveBotToken, setBotEnabled, saveAssistantInstructions } from "@/lib/settings";
import { maskSecret } from "@/lib/crypto";
import { saveSmsCredentials } from "@/lib/sms";
import { logSecurityEvent } from "@/lib/security-log";
import { prisma } from "@/lib/prisma";

const SaveTokenSchema = z.object({
  platform: z.enum(["TELEGRAM", "BALE"]),
  token: z.string().trim().min(10, "توکن واردشده خیلی کوتاه است."),
});

export type SaveTokenFormState =
  | { message?: string; success?: string }
  | undefined;

export async function saveBotTokenAction(
  _prevState: SaveTokenFormState,
  formData: FormData
): Promise<SaveTokenFormState> {
  const session = await requireSession();
  if (session.role !== "OWNER") {
    return { message: "فقط مالک سامانه می‌تواند توکن بات را ببیند و تغییر دهد." };
  }

  const validated = SaveTokenSchema.safeParse({
    platform: formData.get("platform"),
    token: formData.get("token"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "توکن نامعتبر است." };
  }

  await saveBotToken(session.clinicId, validated.data.platform, validated.data.token);
  await logSecurityEvent(
    session.clinicId,
    "BOT_TOKEN_UPDATED",
    `${validated.data.platform}: ${maskSecret(validated.data.token)}`,
    session.staffId
  );

  revalidatePath("/dashboard/settings");
  return { success: `توکن ذخیره شد (${maskSecret(validated.data.token)}).` };
}

export async function setBotEnabledAction(
  platform: "TELEGRAM" | "BALE",
  enabled: boolean
) {
  const session = await requireSession();
  if (!canManageClinic(session.role)) return;

  await setBotEnabled(session.clinicId, platform, enabled);
  revalidatePath("/dashboard/settings");
}

export type SaveInstructionsFormState = { success?: string } | undefined;

export async function saveAssistantInstructionsAction(
  _prevState: SaveInstructionsFormState,
  formData: FormData
): Promise<SaveInstructionsFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) return undefined;

  const text = String(formData.get("instructions") ?? "");
  await saveAssistantInstructions(session.clinicId, text);

  revalidatePath("/dashboard/settings");
  return { success: "دستورالعمل ذخیره شد." };
}

const SaveSmsCredentialsSchema = z.object({
  provider: z.enum(["KAVENEGAR"]),
  apiKey: z.string().trim().min(4, "کلید API خیلی کوتاه است."),
  senderNumber: z.string().trim().optional(),
});

export type SaveSmsCredentialsFormState = { message?: string; success?: string } | undefined;

/** OWNER-only: this is the piece that actually costs money to configure. */
export async function saveSmsCredentialsAction(
  _prevState: SaveSmsCredentialsFormState,
  formData: FormData
): Promise<SaveSmsCredentialsFormState> {
  const session = await requireSession();
  if (session.role !== "OWNER") {
    return { message: "فقط مالک سامانه می‌تواند سرویس پیامک را تنظیم کند." };
  }

  const validated = SaveSmsCredentialsSchema.safeParse({
    provider: formData.get("provider"),
    apiKey: formData.get("apiKey"),
    senderNumber: formData.get("senderNumber") || undefined,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  }

  await saveSmsCredentials(
    session.clinicId,
    validated.data.provider,
    validated.data.apiKey,
    validated.data.senderNumber ?? ""
  );
  await logSecurityEvent(
    session.clinicId,
    "SMS_SETTINGS_UPDATED",
    `کلید سرویس ${validated.data.provider} ذخیره شد`,
    session.staffId
  );

  revalidatePath("/dashboard/settings");
  return { success: "اطلاعات سرویس پیامک ذخیره شد." };
}

const SavePreferencesSchema = z.object({
  confirmationEnabled: z.boolean(),
  reminder24hEnabled: z.boolean(),
  reminder2to4hEnabled: z.boolean(),
  confirmationTemplate: z.string().trim().optional(),
  reminder24hTemplate: z.string().trim().optional(),
  reminder2to4hTemplate: z.string().trim().optional(),
});

export type SaveSmsPreferencesFormState = { success?: string } | undefined;

/** Shared between OWNER and ADMIN - enabling/disabling and wording, not the paid credential. */
export async function saveSmsPreferencesAction(
  _prevState: SaveSmsPreferencesFormState,
  formData: FormData
): Promise<SaveSmsPreferencesFormState> {
  const session = await requireSession();
  if (!canManageClinic(session.role)) return undefined;

  const validated = SavePreferencesSchema.parse({
    confirmationEnabled: formData.get("confirmationEnabled") === "on",
    reminder24hEnabled: formData.get("reminder24hEnabled") === "on",
    reminder2to4hEnabled: formData.get("reminder2to4hEnabled") === "on",
    confirmationTemplate: formData.get("confirmationTemplate") || undefined,
    reminder24hTemplate: formData.get("reminder24hTemplate") || undefined,
    reminder2to4hTemplate: formData.get("reminder2to4hTemplate") || undefined,
  });

  await prisma.smsSettings.upsert({
    where: { clinicId: session.clinicId },
    create: { clinicId: session.clinicId, ...validated },
    update: validated,
  });

  revalidatePath("/dashboard/settings");
  return { success: "تنظیمات پیامک ذخیره شد." };
}
