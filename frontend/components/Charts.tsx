"use client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useTheme } from "@/lib/theme";

function useChartColors() {
  const { theme } = useTheme();
  return {
    grid:    theme === "dark" ? "#2E2E2E" : "#E5E7EB",
    tick:    theme === "dark" ? "#6B6B6B" : "#9CA3AF",
    tooltip: {
      backgroundColor: theme === "dark" ? "#1C1C1C" : "#FFFFFF",
      border:          `1px solid ${theme === "dark" ? "#2E2E2E" : "#E5E7EB"}`,
      borderRadius:    8,
      color:           theme === "dark" ? "#F5F5F5" : "#111827",
      fontSize:        12,
    },
    cursor: theme === "dark" ? "#ffffff08" : "#00000008",
  };
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background:  "var(--surface)",
        border:      "1px solid var(--border-glow)",
        boxShadow:   "0 0 18px rgba(139,0,87,0.18), 0 0 40px rgba(139,0,87,0.06), inset 0 1px 0 rgba(139,0,87,0.2)",
      }}
    >
      {/* top LED strip */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full"
        style={{ background: "linear-gradient(90deg, transparent, #8B0057 30%, #B5006E 50%, #8B0057 70%, transparent)", opacity: 0.7 }}
      />
      <h3 className="text-xs uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>{title}</h3>
      {children}
    </div>
  );
}

export function StepsChart({ data }: { data: { date: string; steps: number }[] }) {
  const c = useChartColors();
  const last7 = data.slice(-7).map(d => ({ ...d, date: d.date.slice(5) }));
  return (
    <ChartCard title="Pasos — últimos 7 días">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={last7}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
          <Tooltip contentStyle={c.tooltip} cursor={{ fill: c.cursor }} />
          <Bar dataKey="steps" fill="#8B0057" radius={[4, 4, 0, 0]} name="Pasos" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HeartRateChart({ data }: { data: { date: string; hr_avg: number; hr_max: number; hr_min: number }[] }) {
  const c = useChartColors();
  const last7 = data.slice(-7).map(d => ({ ...d, date: d.date.slice(5) }));
  return (
    <ChartCard title="Frecuencia cardíaca — últimos 7 días">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={last7}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
          <Tooltip contentStyle={c.tooltip} />
          <Line dataKey="hr_max" stroke="#FFD600" strokeWidth={1.5} dot={false} name="Máx" />
          <Line dataKey="hr_avg" stroke="#8B0057" strokeWidth={2} dot={false} name="Media" />
          <Line dataKey="hr_min" stroke={c.grid} strokeWidth={1.5} dot={false} name="Mín" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SleepChart({ data }: { data: { date: string; duration_hours: number; deep_min: number; rem_min: number; light_min: number }[] }) {
  const c = useChartColors();
  const last7 = data.slice(-7).map(d => ({ ...d, date: d.date.slice(5) }));
  return (
    <ChartCard title="Sueño — últimos 7 días">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={last7}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
          <Tooltip contentStyle={c.tooltip} />
          <Bar dataKey="deep_min" stackId="s" fill="#8B0057" name="Profundo" />
          <Bar dataKey="rem_min" stackId="s" fill="#B5006E" name="REM" />
          <Bar dataKey="light_min" stackId="s" fill={c.grid} name="Ligero" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function VolumeChart({ data }: { data: { week: string; total_volume: number }[] }) {
  const c = useChartColors();
  const last8 = data.slice(-8).map(d => ({ ...d, week: d.week.slice(5) }));
  return (
    <ChartCard title="Volumen de entrenamiento — semanas">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={last8}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis dataKey="week" tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: c.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
          <Tooltip contentStyle={c.tooltip} cursor={{ fill: c.cursor }} />
          <Bar dataKey="total_volume" fill="#FFD600" radius={[4, 4, 0, 0]} name="Volumen (kg)" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
