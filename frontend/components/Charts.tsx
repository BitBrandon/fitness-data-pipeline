"use client";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useTheme } from "@/lib/theme";

/* ── shared helpers ── */

function useC() {
  const { theme, accents } = useTheme();
  const dark   = theme === "dark";
  const sakura = theme === "sakura";
  return {
    grid:  dark ? "#1E1E1E" : sakura ? "#F5D5E8" : "#F0F0F0",
    tick:  dark ? "#555"    : sakura ? "#C090A8" : "#9CA3AF",
    bg:    dark ? "#111"    : "#FFF",
    muted: dark ? "#333"    : sakura ? "#F0C8DC" : "#E5E7EB",
    ...accents,
  };
}

function CustomTooltip({ active, payload, label, unit = "" }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(10,10,10,0.92)",
      border: "1px solid #3a003a",
      borderRadius: 12,
      padding: "8px 12px",
      boxShadow: "0 0 16px var(--c-glow)",
      backdropFilter: "blur(8px)",
    }}>
      <p style={{ color: "#6B6B6B", fontSize: 10, marginBottom: 4, letterSpacing: "0.1em" }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontSize: 12, fontWeight: 700 }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}{unit}
        </p>
      ))}
    </div>
  );
}

function Card({ title, children, accent }: {
  title: string; children: React.ReactNode; accent?: string;
}) {
  const { accents } = useTheme();
  const a = accent ?? accents.main;
  return (
    <div className="rounded-2xl p-4 relative overflow-hidden" style={{
      background: "var(--surface)",
      border: "1px solid var(--border-glow)",
      boxShadow: `0 0 24px ${a}18, inset 0 1px 0 ${a}28`,
    }}>
      <div className="absolute top-0 left-6 right-6 h-px rounded-full" style={{
        background: `linear-gradient(90deg,transparent,${a} 40%,${a} 60%,transparent)`,
        opacity: 0.6,
      }} />
      <p className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

/* ── Steps ── */
export function StepsChart({ data, goalLine }: { data: { date: string; steps: number }[]; goalLine?: number }) {
  const c = useC();
  const last7 = data.slice(-7).map(d => ({ ...d, date: d.date.slice(5) }));
  return (
    <Card title="Pasos, últimos 7 días">
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={last7} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gSteps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c.main} stopOpacity={0.5} />
              <stop offset="100%" stopColor={c.main} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
          {goalLine && <ReferenceLine y={goalLine} stroke={c.main} strokeDasharray="4 3" strokeOpacity={0.5} />}
          <Tooltip content={<CustomTooltip />} />
          <Area dataKey="steps" stroke={c.main} strokeWidth={2} fill="url(#gSteps)"
            dot={{ fill: c.main, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: c.light, stroke: c.main, strokeWidth: 2 }}
            name="Pasos" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ── Heart rate ── */
export function HeartRateChart({ data }: { data: { date: string; hr_avg: number; hr_max: number; hr_min: number }[] }) {
  const c = useC();
  const last7 = data.slice(-7).map(d => ({ ...d, date: d.date.slice(5) }));
  return (
    <Card title="Frecuencia cardíaca, 7 días">
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={last7} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gHR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c.light} stopOpacity={0.25} />
              <stop offset="100%" stopColor={c.light} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={["auto","auto"]} />
          <Tooltip content={<CustomTooltip unit=" bpm" />} />
          <Area dataKey="hr_max" stroke="none" fill="url(#gHR)" name="Máx" fillOpacity={1} />
          <Line dataKey="hr_max"  stroke={c.hl2}  strokeWidth={1.5} dot={false} name="Máx" />
          <Line dataKey="hr_avg"  stroke={c.light} strokeWidth={2.5}
            dot={{ fill: c.light, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: c.hl2, strokeWidth: 0 }}
            name="Media" />
          <Line dataKey="hr_min"  stroke={c.main}  strokeWidth={1.5} dot={false} name="Mín" />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ── Sleep ── */
export function SleepChart({ data }: { data: { date: string; duration_hours: number; deep_min: number; rem_min: number; light_min: number }[] }) {
  const c = useC();
  const last7 = data.slice(-7).map(d => ({ ...d, date: d.date.slice(5) }));
  return (
    <Card title="Sueño, últimos 7 días">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={last7} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={18}>
          <CartesianGrid strokeDasharray="2 4" stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={28} unit="h" />
          <Tooltip content={<CustomTooltip unit=" min" />} />
          <Bar dataKey="deep_min"  stackId="s" fill={c.main}  name="Profundo" />
          <Bar dataKey="rem_min"   stackId="s" fill={c.light} name="REM" />
          <Bar dataKey="light_min" stackId="s" fill={c.muted} name="Ligero" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ── Volume ── */
export function VolumeChart({ data }: { data: { week: string; total_volume: number }[] }) {
  const c = useC();
  const last8 = data.slice(-8).map(d => ({ ...d, week: d.week.slice(5) }));
  return (
    <Card title="Volumen entreno, semanas">
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={last8} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c.hl} stopOpacity={0.45} />
              <stop offset="100%" stopColor={c.hl} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={c.grid} vertical={false} />
          <XAxis dataKey="week" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={40}
            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
          <Tooltip content={<CustomTooltip unit=" kg" />} />
          <Area dataKey="total_volume" stroke={c.hl} strokeWidth={2} fill="url(#gVol)"
            dot={{ fill: c.hl, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#fff", stroke: c.hl, strokeWidth: 2 }}
            name="Volumen" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ── Weight evolution ── */
export function WeightChart({ data }: { data: { date: string; weight: number }[] }) {
  const c = useC();
  const minW = Math.min(...data.map(d => d.weight));
  const maxW = Math.max(...data.map(d => d.weight));
  const displayed = data.slice(-30).map(d => ({ ...d, date: d.date.slice(5) }));
  return (
    <Card title="Últimos 30 registros">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={displayed} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c.hl} stopOpacity={0.45} />
              <stop offset="100%" stopColor={c.hl} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false}
            interval={Math.max(0, Math.floor(displayed.length / 5) - 1)} />
          <YAxis tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false}
            width={36} unit="kg" domain={[minW - 0.5, maxW + 0.5]} />
          <ReferenceLine y={minW} stroke="#00C950" strokeDasharray="4 3" strokeOpacity={0.5} />
          <Tooltip content={<CustomTooltip unit=" kg" />} />
          <Area dataKey="weight" stroke={c.hl} strokeWidth={2.5} fill="url(#gWeight)"
            dot={false} activeDot={{ r: 5, fill: c.hl, stroke: "#fff", strokeWidth: 2 }}
            name="Peso" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ── Exercise progression (max weight per session) ── */
export function ExerciseProgressChart({ data, exercise }: {
  data: { date: string; maxWeight: number; volume: number }[];
  exercise: string;
}) {
  const c = useC();
  if (data.length < 2) return (
    <div className="flex items-center justify-center h-40 text-xs" style={{ color: "var(--text-muted)" }}>
      Pocos datos para mostrar progresión
    </div>
  );
  return (
    <Card title={`Progresión — ${exercise}`}>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gProg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c.hl} stopOpacity={0.3} />
              <stop offset="100%" stopColor={c.hl} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={c.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: c.tick, fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis yAxisId="w" tick={{ fill: c.tick, fontSize: 10 }} axisLine={false} tickLine={false} width={36} unit="kg" />
          <YAxis yAxisId="v" orientation="right" tick={{ fill: c.tick, fontSize: 9 }} axisLine={false} tickLine={false} width={36}
            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
          <Tooltip content={<CustomTooltip />} />
          <Area yAxisId="v" dataKey="volume" stroke="none" fill="url(#gProg)" name="Volumen" fillOpacity={1} />
          <Line yAxisId="w" dataKey="maxWeight" stroke={c.hl} strokeWidth={2.5}
            dot={{ fill: c.hl, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#fff", stroke: c.hl, strokeWidth: 2 }}
            name="Peso máx (kg)" />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ── Sparkline (mini inline chart for dashboard tiles) ── */
export function Sparkline({ data, color, height = 40 }: {
  data: number[]; color?: string; height?: number;
}) {
  const { accents } = useTheme();
  color = color ?? accents.main;
  const points = data.map((v, i) => ({ v, i }));
  if (points.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#spark-${color.replace("#","")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
