import "server-only";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { createKavenegarProvider } from "./kavenegar";
import type { SmsProvider, SmsSendResult } from "./types";

export type { SmsProvider, SmsSendResult };

export async function getSmsSettings(clinicId: string) {
  return prisma.smsSettings.findUnique({ where: { clinicId } });
}

export async function saveSmsCredentials(
  clinicId: string,
  provider: string,
  apiKey: string,
  senderNumber: string
): Promise<void> {
  const encryptedApiKey = encryptSecret(apiKey);
  await prisma.smsSettings.upsert({
    where: { clinicId },
    create: { clinicId, provider, encryptedApiKey, senderNumber: senderNumber || null },
    update: { provider, encryptedApiKey, senderNumber: senderNumber || null },
  });
}

function buildProvider(
  providerName: string,
  apiKey: string,
  senderNumber: string | null
): SmsProvider | null {
  if (providerName === "KAVENEGAR") {
    return createKavenegarProvider(apiKey, senderNumber ?? undefined);
  }
  return null;
}

/** Returns null if the clinic hasn't set an SMS API key yet - never throws. */
export async function sendClinicSms(
  clinicId: string,
  to: string,
  text: string
): Promise<SmsSendResult> {
  const settings = await prisma.smsSettings.findUnique({ where: { clinicId } });
  if (!settings?.encryptedApiKey) {
    return { ok: false, error: "سرویس پیامک هنوز تنظیم نشده است." };
  }

  const apiKey = decryptSecret(settings.encryptedApiKey);
  const provider = buildProvider(settings.provider, apiKey, settings.senderNumber);
  if (!provider) {
    return { ok: false, error: `سرویس پیامک «${settings.provider}» پشتیبانی نمی‌شود.` };
  }

  return provider.send(to, text);
}
