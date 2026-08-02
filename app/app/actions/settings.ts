"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { saveBotToken, setBotEnabled, saveAssistantInstructions } from "@/lib/settings";
import { maskSecret } from "@/lib/crypto";

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
  if (session.role !== "ADMIN") {
    return { message: "فقط مدیر کلینیک می‌تواند تنظیمات بات را تغییر دهد." };
  }

  const validated = SaveTokenSchema.safeParse({
    platform: formData.get("platform"),
    token: formData.get("token"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "توکن نامعتبر است." };
  }

  await saveBotToken(session.clinicId, validated.data.platform, validated.data.token);

  revalidatePath("/dashboard/settings");
  return { success: `توکن ذخیره شد (${maskSecret(validated.data.token)}).` };
}

export async function setBotEnabledAction(
  platform: "TELEGRAM" | "BALE",
  enabled: boolean
) {
  const session = await requireSession();
  if (session.role !== "ADMIN") return;

  await setBotEnabled(session.clinicId, platform, enabled);
  revalidatePath("/dashboard/settings");
}

export type SaveInstructionsFormState = { success?: string } | undefined;

export async function saveAssistantInstructionsAction(
  _prevState: SaveInstructionsFormState,
  formData: FormData
): Promise<SaveInstructionsFormState> {
  const session = await requireSession();
  if (session.role !== "ADMIN") return undefined;

  const text = String(formData.get("instructions") ?? "");
  await saveAssistantInstructions(session.clinicId, text);

  revalidatePath("/dashboard/settings");
  return { success: "دستورالعمل ذخیره شد." };
}
