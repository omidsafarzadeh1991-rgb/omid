import { getConnectionStatuses } from "@/lib/connection-status";

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  connected: { label: "متصل", bg: "#e4f3f0", fg: "#075a50" },
  error: { label: "مشکل دارد", bg: "#fdeceb", fg: "#b42318" },
  unknown: { label: "نامشخص", bg: "#f1f5f9", fg: "#475569" },
  disabled: { label: "غیرفعال", bg: "#f1f5f9", fg: "#94a3b8" },
};

export default async function ConnectionStatusCard({ clinicId }: { clinicId: string }) {
  const statuses = await getConnectionStatuses(clinicId);
  if (statuses.length === 0) return null;

  return (
    <section className="surface animate-in p-6">
      <h2 className="mb-4 text-base font-bold text-slate-900">وضعیت اتصال بات‌ها و هوش مصنوعی</h2>
      <div className="flex flex-wrap gap-3">
        {statuses.map((s) => {
          const meta = STATUS_META[s.status];
          return (
            <div
              key={s.key}
              className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2"
              title={s.detail}
            >
              <span className="text-sm font-medium text-slate-700">{s.label}</span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: meta.bg, color: meta.fg }}
              >
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
