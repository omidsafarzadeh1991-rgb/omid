import type { Metadata } from "next";
import { AppointmentForm } from "@/components/appointment/AppointmentForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { getServiceOptions } from "@/lib/data/services";
import { medicalDisclaimer } from "@/lib/config";

export const metadata: Metadata = {
  title: "رزرو نوبت نمونه‌گیری",
  description:
    "ثبت درخواست رزرو نوبت نمونه‌گیری در آزمایشگاه تخصصی ترنج.",
};

export default async function AppointmentPage(
  props: PageProps<"/appointment">,
) {
  const searchParams = await props.searchParams;
  const defaultServiceId =
    typeof searchParams.service === "string" ? searchParams.service : undefined;

  const services = await getServiceOptions();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        رزرو نوبت نمونه‌گیری
      </h1>
      <p className="mt-3 text-base leading-8 text-muted-foreground">
        فرم زیر را تکمیل کنید. درخواست شما پس از بررسی توسط تیم آزمایشگاه
        تأیید نهایی می‌شود.
      </p>

      <div className="mt-8">
        {services.length === 0 ? (
          <EmptyState
            title="در حال حاضر امکان ثبت نوبت وجود ندارد"
            description="خدمتی برای رزرو ثبت نشده است. لطفاً بعداً دوباره تلاش کنید یا با ما تماس بگیرید."
          />
        ) : (
          <AppointmentForm
            services={services}
            defaultServiceId={defaultServiceId}
          />
        )}
      </div>

      <p className="mt-8 text-xs leading-6 text-muted-foreground">
        {medicalDisclaimer}
      </p>
    </div>
  );
}
