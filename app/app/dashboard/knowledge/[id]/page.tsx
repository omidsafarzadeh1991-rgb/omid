import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { canManageClinic } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import EditFaqForm from "./EditFaqForm";

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  if (!canManageClinic(session.role)) {
    redirect("/dashboard");
  }

  const faq = await prisma.faqEntry.findFirst({
    where: { id, clinicId: session.clinicId },
  });
  if (!faq) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900">ویرایش سوال متداول</h1>

      <section className="card animate-in p-6">
        <EditFaqForm
          faq={{
            id: faq.id,
            category: faq.category,
            question: faq.question,
            answer: faq.answer,
            keywords: faq.keywords,
            priority: faq.priority,
          }}
        />
      </section>
    </main>
  );
}
