import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { canManageClinic } from "@/lib/roles";
import { listFaqEntries, getClinicInfo } from "@/lib/knowledge";
import AddFaqForm from "./AddFaqForm";
import FaqToggleButton from "./FaqToggleButton";
import DeleteFaqButton from "./DeleteFaqButton";
import ClinicInfoForm from "./ClinicInfoForm";
import { CATEGORY_LABELS } from "./categories";

export default async function KnowledgePage() {
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    redirect("/dashboard");
  }

  const [faqEntries, clinicInfo] = await Promise.all([
    listFaqEntries(session.clinicId),
    getClinicInfo(session.clinicId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">مرکز دانش</h1>
        <p className="mt-1 text-sm text-slate-500">
          هرچه این‌جا کامل‌تر باشد، بات هوش مصنوعی کمتر نیاز به حدس‌زدن دارد و
          سریع‌تر و ارزان‌تر جواب می‌دهد. سوال‌هایی که این‌جا تعریف می‌کنید،
          اصلاً به هوش مصنوعی فرستاده نمی‌شوند - مستقیم از همین‌جا جواب داده
          می‌شوند.
        </p>
      </div>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          اطلاعات ثابت کلینیک
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          این اطلاعات به هوش مصنوعی داده می‌شود تا هیچ‌وقت آدرس، تلفن، ساعت
          کاری یا بیمه را از خودش نسازد.
        </p>
        <ClinicInfoForm info={clinicInfo} />
      </section>

      <section className="card animate-in p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          سوالات متداول (FAQ)
        </h2>
        {faqEntries.length === 0 ? (
          <p className="mb-6 text-sm text-slate-500">هنوز سوالی اضافه نکرده‌اید.</p>
        ) : (
          <ul className="mb-6 divide-y divide-slate-100">
            {faqEntries.map((faq) => (
              <li key={faq.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{faq.question}</p>
                  <p className="text-xs text-slate-500">
                    {CATEGORY_LABELS[faq.category] ?? faq.category} · اولویت {faq.priority}
                    {!faq.active && (
                      <span className="mr-2 rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                        غیرفعال
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/dashboard/knowledge/${faq.id}`}
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    ویرایش
                  </Link>
                  <FaqToggleButton id={faq.id} active={faq.active} />
                  <DeleteFaqButton id={faq.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <AddFaqForm />
      </section>
    </main>
  );
}
