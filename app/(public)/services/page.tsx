import type { Metadata } from "next";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { ServiceFilterForm } from "@/components/shared/ServiceFilterForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { searchServices, getServiceCategories } from "@/lib/data/services";

export const metadata: Metadata = {
  title: "خدمات و آزمایش‌ها",
  description:
    "فهرست آزمایش‌های تشخیصی آزمایشگاه تخصصی ترنج به همراه زمان تقریبی پاسخ‌دهی و هزینه.",
};

export default async function ServicesPage(props: PageProps<"/services">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const category =
    typeof searchParams.category === "string" ? searchParams.category : undefined;

  const [services, categories] = await Promise.all([
    searchServices({ q, category }),
    getServiceCategories(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          خدمات و آزمایش‌ها
        </h1>
        <p className="mt-3 text-base leading-8 text-muted-foreground">
          فهرست آزمایش‌های قابل انجام در آزمایشگاه تخصصی ترنج به همراه دسته‌بندی،
          زمان تقریبی پاسخ‌دهی و هزینه تقریبی.
        </p>
      </div>

      <div className="mt-8">
        <ServiceFilterForm
          categories={categories}
          defaultQuery={q}
          defaultCategory={category}
        />
      </div>

      {services.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="خدمتی مطابق جست‌وجوی شما یافت نشد"
          description="عبارت جست‌وجو یا دسته‌بندی را تغییر دهید."
        />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} showBookingLink />
          ))}
        </div>
      )}
    </div>
  );
}
