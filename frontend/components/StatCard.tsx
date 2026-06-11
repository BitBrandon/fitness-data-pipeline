interface Props {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  color?: string;
  icon: string;
}

export default function StatCard({ label, value, unit, sub, color = "#8B0057", icon }: Props) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 transition-colors"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-col)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        {unit && <span className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>{unit}</span>}
      </div>
      {sub && <span className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</span>}
    </div>
  );
}
