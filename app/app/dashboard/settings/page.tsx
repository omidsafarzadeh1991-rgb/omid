import { redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { canManageClinic } from "@/lib/roles";
import {
  getBotIntegrations,
  getWebhookSecret,
  getAssistantInstructions,
} from "@/lib/settings";
import { getSmsSettings } from "@/lib/sms";
import { setBotEnabledAction } from "@/app/actions/settings";
import BotTokenForm from "./BotTokenForm";
import AssistantInstructionsForm from "./AssistantInstructionsForm";
import SmsCredentialsForm from "./SmsCredentialsForm";
import SmsPreferencesForm from "./SmsPreferencesForm";

async function TelegramWebhookInfo({ clinicId }: { clinicId: string }) {
  const secret = await getWebhookSecret(clinicId, "TELEGRAM");
  if (!secret) return null;

  const webhookUrl = `https://<آدرس-ngrok-شما>/api/telegram/webhook/${clinicId}`;
  const curlCommand = `curl "https://api.telegram.org/bot<توکن-ربات-شما>/setWebhook" -d "url=${webhookUrl}" -d "secret_token=${secret}"`;

  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
      <p className="mb-2 text-slate-700">
        برای فعال‌شدن بات روی تلگرام، یک‌بار (و بعد از هر بار که آدرس ngrok
        عوض شد) این دستور را با آدرس واقعی ngrok و توکن ربات خودتان جایگزین
        کنید و در Command Prompt اجرا کنید:
      </p>
      <pre
        dir="ltr"
        className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100"
      >
        {curlCommand}
      </pre>
      <p className="mt-2 text-xs text-slate-500">
        این کار فقط با اتصال به اینترنت ممکن است (تلگرام باید بتواند به سیستم
        شما پیام برساند)؛ راهنمای کامل نصب و اجرای ngrok در فایل README پروژه
        آمده است.
      </p>
    </div>
  );
}

const PLATFORMS = [
  {
    value: "TELEGRAM" as const,
    label: "تلگرام",
    hint: "توکن را از @BotFather در تلگرام بگیرید.",
  },
  {
    value: "BALE" as const,
    label: "بله",
    hint: "توکن را از پنل توسعه‌دهندگان بله بگیرید.",
  },
];

export default async function SettingsPage() {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    redirect("/dashboard");
  }
  const isOwner = session.role === "OWNER";

  const [integrationsList, assistantInstructions, smsSettings] = await Promise.all([
    getBotIntegrations(session.clinicId),
    getAssistantInstructions(session.clinicId),
    getSmsSettings(session.clinicId),
  ]);
  const byPlatform = new Map(integrationsList.map((i) => [i.platform, i]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">تنظیمات بات‌ها و پیامک</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isOwner
            ? "توکن هر پیام‌رسان و کلید سرویس پیامک را اینجا وارد کنید. این مقادیر رمزنگاری‌شده ذخیره می‌شوند و بعد از ذخیره دوباره نمایش داده نمی‌شوند."
            : "می‌توانید بات را فعال/غیرفعال کنید و متن پیام‌ها را ویرایش کنید؛ برای وارد‌کردن یا تغییر توکن/کلید سرویس، از مالک سامانه بخواهید."}
        </p>
      </div>

      <section className="card animate-in p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          دستورالعمل اضافی برای هوش مصنوعی
        </h2>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          هرچیزی که دوست دارید بات با بیمار بگوید یا نگوید، یا اطلاعاتی مثل
          آدرس و قوانین خاص مطب، اینجا بنویسید. این متن همیشه علاوه بر
          قوانین ثابت امنیتی برنامه اعمال می‌شود (مثلاً بات هیچ‌وقت، حتی با
          این دستورالعمل، مشاورهٔ پزشکی نمی‌دهد). بات از قبل اسم پزشکان،
          روزها و ساعات کاری، خدمات و قیمت‌هایی که در «مدیریت پزشکان» ثبت
          کرده‌اید را می‌بیند؛ نیازی نیست اینجا دوباره تکرار کنید.
        </p>
        <AssistantInstructionsForm defaultValue={assistantInstructions} />
      </section>

      {PLATFORMS.map((platform) => {
        const integration = byPlatform.get(platform.value);
        return (
          <section key={platform.value} className="card animate-in p-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {platform.label}
                </h2>
                <p className="text-xs text-slate-500">{platform.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    integration?.enabled
                      ? "bg-teal-50 text-teal-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {integration
                    ? integration.enabled
                      ? "فعال"
                      : "غیرفعال"
                    : "تنظیم نشده"}
                </span>
                {integration && (
                  <form
                    action={async () => {
                      "use server";
                      await setBotEnabledAction(platform.value, !integration.enabled);
                    }}
                  >
                    <button type="submit" className="btn btn-secondary btn-sm">
                      {integration.enabled ? "غیرفعال کردن" : "فعال کردن"}
                    </button>
                  </form>
                )}
              </div>
            </div>
            {isOwner ? (
              <>
                <BotTokenForm platform={platform.value} hasToken={!!integration} />
                {platform.value === "TELEGRAM" && integration && (
                  <TelegramWebhookInfo clinicId={session.clinicId} />
                )}
              </>
            ) : (
              !integration && (
                <p className="text-xs text-slate-400">
                  هنوز توکنی برای این پیام‌رسان تنظیم نشده؛ از مالک سامانه بخواهید وارد کند.
                </p>
              )
            )}
          </section>
        );
      })}

      <section className="card animate-in p-6 text-sm text-slate-500">
        واتس‌اپ و اینستاگرام در فازهای بعدی و بعد از هماهنگی دربارهٔ هزینه و
        تأییدیهٔ Meta Business اضافه می‌شوند.
      </section>

      <section className="card animate-in p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">پیامک یادآوری نوبت</h2>
        <p className="mb-4 mt-1 text-xs text-slate-500">
          پیامک واقعاً هزینه دارد و از حساب پیامکی خودتان کسر می‌شود. تا وقتی
          کلید سرویس پیامک تنظیم نشده، هیچ پیامکی ارسال نمی‌شود.
        </p>
        {isOwner && (
          <div className="mb-6 border-b border-slate-100 pb-6">
            <SmsCredentialsForm
              hasCredentials={!!smsSettings?.encryptedApiKey}
              defaultSenderNumber={smsSettings?.senderNumber ?? ""}
            />
          </div>
        )}
        {!isOwner && !smsSettings?.encryptedApiKey && (
          <p className="mb-4 text-xs text-slate-400">
            هنوز کلید سرویس پیامک تنظیم نشده؛ از مالک سامانه بخواهید وارد کند.
          </p>
        )}
        <SmsPreferencesForm
          defaults={{
            confirmationEnabled: smsSettings?.confirmationEnabled ?? true,
            reminder24hEnabled: smsSettings?.reminder24hEnabled ?? true,
            reminder2to4hEnabled: smsSettings?.reminder2to4hEnabled ?? true,
            confirmationTemplate: smsSettings?.confirmationTemplate ?? "",
            reminder24hTemplate: smsSettings?.reminder24hTemplate ?? "",
            reminder2to4hTemplate: smsSettings?.reminder2to4hTemplate ?? "",
          }}
        />
      </section>
    </main>
  );
}
