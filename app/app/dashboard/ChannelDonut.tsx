import SourceBadge, { sourceColor } from "./SourceBadge";

type Row = { source: string; count: number };

const SIZE = 120;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ChannelDonut({ rows }: { rows: Row[] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0) || 1;
  const sorted = [...rows].sort((a, b) => b.count - a.count);

  const arcs = sorted.reduce<{ source: string; count: number; dash: number; offset: number }[]>(
    (acc, row) => {
      const dash = (row.count / total) * CIRCUMFERENCE;
      const previousEnd = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
      return [...acc, { ...row, dash, offset: previousEnd }];
    },
    []
  );

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90 shrink-0">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={STROKE}
        />
        {arcs.map((arc) => (
          <circle
            key={arc.source}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={sourceColor(arc.source)}
            strokeWidth={STROKE}
            strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="space-y-2.5">
        {sorted.map((row) => (
          <div key={row.source} className="flex items-center gap-3 text-sm">
            <SourceBadge source={row.source} />
            <span className="stat-value stat-compact">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
