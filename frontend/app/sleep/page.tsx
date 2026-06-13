"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, SleepRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { SleepChart } from "@/components/Charts";
import LoadingScreen from "@/components/LoadingScreen";
import { useSettings } from "@/lib/settings";
import { useTheme } from "@/lib/theme";

function sleepScore(r: SleepRow, goalH: number): number {
  const total = r.deep_min + r.rem_min + r.light_min;
  const dur  = Math.min(50, (r.duration_hours / goalH) * 50);
  const qual = total > 0 ? Math.min(50, ((r.deep_min + r.rem_min) / total) * 50) : 0;
  return Math.round(dur + qual);
}

function scoreColor(s: number, hl: string, hl2: string) {
  return s >= 80 ? "#00C950" : s >= 60 ? hl : hl2;
}

function PhaseBar({ deep, rem, light, awake, mainColor, lightColor }: {
  deep: number; rem: number; light: number; awake: number;
  mainColor: string; lightColor: string;
}) {
  const total = deep + rem + light + awake || 1;
  const segs = [
    { v: deep,  c: mainColor,        label: "Profundo" },
    { v: rem,   c: lightColor,       label: "REM" },
    { v: light, c: "var(--border-col)", label: "Ligero" },
    { v: awake, c: "var(--surface-2)", label: "Despierto" },
  ];
  return (
    <div className="h-2.5 rounded-full overflow-hidden flex gap-px">
      {segs.map(s => s.v > 0 && (
        <div key={s.label} title={`${s.label}: ${s.v}min`}
          style={{ width: `${(s.v / total) * 100}%`, background: s.c, minWidth: 3 }} />
      ))}
    </div>
  );
}

export default function SleepPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { accents } = useTheme();
  const GOAL_H = settings.sleepGoalH ?? 8;

  const [data, setData] = useState<SleepRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await api.sleep();
      setData(rows.sort((a, b) => a.date.localeCompare(b.date)));
    } catch { router.replace("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingScreen color={accents.main} />;

  const last  = data[data.length - 1];
  const avg   = (k: keyof SleepRow) =>
    data.length ? Math.round((data.reduce((s, r) => s + Number(r[k]), 0) / data.length) * 10) / 10 : 0;
  const best  = data.reduce((b, r) => r.duration_hours > (b?.duration_hours ?? 0) ? r : b, data[0]);

  const last7  = data.slice(-7);
  const prev7  = data.slice(-14, -7);
  const avgScore7  = last7.length  ? Math.round(last7.reduce((s, r)  => s + sleepScore(r, GOAL_H), 0) / last7.length)  : null;
  const avgScorePrev = prev7.length ? Math.round(prev7.reduce((s, r) => s + sleepScore(r, GOAL_H), 0) / prev7.length) : null;
  const trend  = avgScore7 != null && avgScorePrev != null
    ? avgScore7 - avgScorePrev : null;

  const lastScore = last ? sleepScore(last, GOAL_H) : null;

  return (
    <AppShell>
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* header */}
        <div className="animate-fade-up">
          <p className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: accents.main }}>Sueño</p>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Historial de sueño</h1>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{data.length} noches</span>
          </div>
        </div>

        {/* última noche */}
        {last && lastScore !== null && (
          <div className="scan-on-mount rounded-2xl p-5 animate-fade-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border-glow)", boxShadow: `0 0 24px var(--c-glow)`, animationDelay: "50ms" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Última noche · {last.date}</p>
                <p className="text-4xl font-black mt-1" style={{ color: "var(--text-primary)", textShadow: `0 0 20px ${accents.hl}40` }}>
                  {last.duration_hours}<span className="text-lg font-normal ml-1" style={{ color: "var(--text-muted)" }}>h</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Score</p>
                <p className="text-3xl font-black" style={{ color: scoreColor(lastScore, accents.hl, accents.hl2) }}>{lastScore}</p>
              </div>
            </div>

            <PhaseBar deep={last.deep_min} rem={last.rem_min} light={last.light_min} awake={last.awake_min}
              mainColor={accents.main} lightColor={accents.light} />

            <div className="flex gap-4 mt-3 flex-wrap text-xs">
              {[
                { label: "Profundo",  v: last.deep_min,  c: accents.main },
                { label: "REM",       v: last.rem_min,   c: accents.light },
                { label: "Ligero",    v: last.light_min, c: "var(--text-muted)" },
                { label: "Despierto", v: last.awake_min, c: "var(--text-muted)" },
              ].map(s => (
                <span key={s.label} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.c }} />
                  <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  <strong style={{ color: "var(--text-primary)" }}>{s.v}m</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Promedio", value: `${avg("duration_hours")}h`, color: accents.hl,    delay: 100 },
            { label: "Deep avg", value: `${avg("deep_min")}m`,       color: accents.main,  delay: 150 },
            { label: "REM avg",  value: `${avg("rem_min")}m`,        color: accents.light, delay: 200 },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 animate-fade-up"
              style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: `${s.delay}ms` }}>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* trend + best */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Tendencia 7d</p>
            {trend !== null ? (
              <p className="text-xl font-black" style={{ color: trend >= 0 ? "#00C950" : accents.hl2 }}>
                {trend >= 0 ? "+" : ""}{trend} pts
              </p>
            ) : (
              <p className="text-xl font-black" style={{ color: "var(--text-muted)" }}>—</p>
            )}
            {avgScore7 !== null && (
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Score medio: {avgScore7}
              </p>
            )}
          </div>
          {best && (
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: `1px solid ${accents.hl}33` }}>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Mejor noche</p>
              <p className="text-xl font-black" style={{ color: accents.hl }}>{best.duration_hours}h</p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {best.date} · {best.deep_min}m deep
              </p>
            </div>
          )}
        </div>

        {/* chart */}
        {data.length > 0 && (
          <div className="animate-fade-up" style={{ animationDelay: "280ms" }}>
            <SleepChart data={data} />
          </div>
        )}

        {/* history table */}
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: "320ms" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
            <h3 className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Historial completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Fecha", "Total", "Score", "Fases", "Deep", "REM"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(r => {
                  const sc = sleepScore(r, GOAL_H);
                  return (
                    <tr key={r.date} className="row-hover transition-colors" style={{ borderBottom: "1px solid var(--border-col)" }}>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>{r.date}</td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: accents.hl }}>{r.duration_hours}h</td>
                      <td className="px-4 py-2.5 font-bold text-xs" style={{ color: scoreColor(sc, accents.hl, accents.hl2) }}>{sc}</td>
                      <td className="px-4 py-2.5 w-24">
                        <PhaseBar deep={r.deep_min} rem={r.rem_min} light={r.light_min} awake={r.awake_min}
                          mainColor={accents.main} lightColor={accents.light} />
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: accents.main }}>{r.deep_min}m</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: accents.light }}>{r.rem_min}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </AppShell>
  );
}
