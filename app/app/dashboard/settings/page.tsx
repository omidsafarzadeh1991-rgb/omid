import { redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getBotIntegrations } from "@/lib/settings";
import { setBotEnabledAction } from "@/app/actions/settings";
import BotTokenForm from "./BotTokenForm";

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
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const integrations = await getBotIntegrations(session.clinicId);
  const byPlatform = new Map(integrations.map((i) => [i.platform, i]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">تنظیمات بات‌ها</h1>
        <p className="mt-1 text-sm text-slate-500">
          توکن هر پیام‌رسان را اینجا وارد کنید تا بات نوبت‌دهی آن کلینیک روشن
          شود. توکن‌ها رمزنگاری‌شده ذخیره می‌شوند و بعد از ذخیره دوباره نمایش
          داده نمی‌شوند.
        </p>
      </div>

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
            <BotTokenForm platform={platform.value} hasToken={!!integration} />
          </section>
        );
      })}

      <section className="card animate-in p-6 text-sm text-slate-500">
        واتس‌اپ و اینستاگرام در فازهای بعدی و بعد از هماهنگی دربارهٔ هزینه و
        تأییدیهٔ Meta Business اضافه می‌شوند.
      </section>
    </main>
  );
}
