const SOURCE_META: Record<
  string,
  { label: string; bg: string; fg: string; icon: React.ReactNode }
> = {
  MANUAL: {
    label: "ثبت دستی",
    bg: "#f1f5f9",
    fg: "#475569",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 20l3.5-1 11-11-2.5-2.5-11 11L4 20z" />
      </svg>
    ),
  },
  TELEGRAM: {
    label: "تلگرام",
    bg: "#e0f2fe",
    fg: "#0284c7",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 4L3 11.5l6 2 2 6 3-4 4.5 3.5L21 4z" />
      </svg>
    ),
  },
  BALE: {
    label: "بله",
    bg: "#ffedd5",
    fg: "#c2410c",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4h16v11H8l-4 4V4z" />
      </svg>
    ),
  },
  WHATSAPP: {
    label: "واتس‌اپ",
    bg: "#dcfce7",
    fg: "#15803d",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3a9 9 0 00-7.7 13.6L3 21l4.6-1.2A9 9 0 1012 3z" opacity="0.25" />
        <path d="M12 4.5A7.5 7.5 0 004.9 15.4L4 19l3.7-1A7.5 7.5 0 1012 4.5z" />
      </svg>
    ),
  },
  INSTAGRAM: {
    label: "اینستاگرام",
    bg: "#fce7f3",
    fg: "#be185d",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
};

export function sourceLabel(source: string): string {
  return SOURCE_META[source]?.label ?? source;
}

export function sourceColor(source: string): string {
  return SOURCE_META[source]?.fg ?? "#475569";
}

export default function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_META[source] ?? {
    label: source,
    bg: "#f1f5f9",
    fg: "#475569",
    icon: null,
  };

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: meta.bg, color: meta.fg }}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}
