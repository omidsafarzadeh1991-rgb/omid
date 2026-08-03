export default function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 3v4M16 3v4" />
          <path d="M12 14v3M10.5 15.5h3" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}
