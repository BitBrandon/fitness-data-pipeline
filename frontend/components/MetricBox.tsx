interface MetricBoxProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}

export default function MetricBox({ label, value, unit, color = "var(--text-primary)" }: MetricBoxProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}
    >
      <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
        {unit && <span className="text-sm font-normal ml-1" style={{ color: "var(--text-muted)" }}>{unit}</span>}
      </p>
    </div>
  );
}
