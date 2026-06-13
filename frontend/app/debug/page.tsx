"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";

/* ── types ── */
type TableInfo = { count: number; last?: Record<string, unknown>; corrupt_rows?: number; corrupt_examples?: { date: string; issues: string[] }[]; error?: string };
type Counts    = { username: string; tables: Record<string, TableInfo> };
type Token     = { file_exists: boolean; has_token?: boolean; has_refresh?: boolean; expiry?: string };
type SyncState = { state: string; pct: number; step: string; error: string | null; details?: Record<string, Record<string, unknown>> };

const TABLE_LABELS: Record<string, string> = {
  daily_activity:   "Actividad",
  heart_rate_daily: "Frecuencia cardíaca",
  sleep:            "Sueño",
  body_weight:      "Peso corporal",
  workouts:         "Entrenamientos",
  prs:              "Records personales",
};
const TABLE_BOUNDS: Record<string, string> = {
  daily_activity:   "cal: 0–8 000 kcal",
  heart_rate_daily: "pulso: 20–250 bpm",
  sleep:            "duración: 0–20 h",
};
const TABLE_ICONS: Record<string, string> = {
  daily_activity: "🏃", heart_rate_daily: "❤️", sleep: "🌙",
  body_weight: "⚖️", workouts: "🏋️", prs: "🏆",
};

function logColor(line: string) {
  if (line.includes("[ERROR]"))   return "#FF3B30";
  if (line.includes("[WARNING]")) return "#FF9F0A";
  if (line.includes("[INFO]"))    return "#ccc";
  return "#888";
}

export default function ControlPanel() {
  const router   = useRouter();
  const logsRef  = useRef<HTMLDivElement>(null);

  const [counts,    setCounts]    = useState<Counts | null>(null);
  const [token,     setToken]     = useState<Token  | null>(null);
  const [sync,      setSync]      = useState<SyncState | null>(null);
  const [logs,      setLogs]      = useState<string[]>([]);
  const [prs,       setPrs]       = useState<{ exercise: string; pr_weight: number; date: string }[]>([]);

  const [loading,      setLoading]      = useState(true);
  const [countsLoading, setCountsLoading] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [syncing,   setSyncing]   = useState(false);
  const [syncDays,  setSyncDays]  = useState(30);
  const [purging,   setPurging]   = useState<string | null>(null);
  const [purgeMsg,  setPurgeMsg]  = useState<Record<string, string>>({});
  const [prSearch,  setPrSearch]  = useState("");
  const [prDelMsg,  setPrDelMsg]  = useState("");
  const [tab,       setTab]       = useState<"data" | "sync" | "prs" | "logs">("data");

  /* ── loaders ── */
  const loadLogs = useCallback(async () => {
    try {
      const r = await api.debugLogs(300);
      setLogs(r.logs ?? []);
      setTimeout(() => logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight, behavior: "smooth" }), 50);
    } catch { /* non-fatal */ }
  }, []);

  const loadPrs = useCallback(async () => {
    try {
      const rows = await api.prs();
      setPrs(rows);
    } catch { /* non-fatal */ }
  }, []);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const c = await api.debugCounts();
      setCounts(c);
      setError(null);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("401")) { router.replace("/login"); return; }
      setError(`Sheets: ${msg}`);
    } finally {
      setCountsLoading(false);
    }
  }, [router]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, s] = await Promise.all([api.debugToken(), api.syncStatus()]);
      setToken(t as Token);
      setSync(s as SyncState);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("401")) { router.replace("/login"); return; }
      setError(msg);
    }
    await loadLogs();
    await loadCounts();
    await loadPrs();
    setLoading(false);
  }, [router, loadLogs, loadCounts, loadPrs]);

  useEffect(() => { load(); }, [load]);

  /* ── sync ── */
  async function triggerSync() {
    setSyncing(true);
    await api.sync(syncDays);
    const poll = setInterval(async () => {
      try {
        const [s] = await Promise.all([api.syncStatus(), loadLogs()]);
        const st = s as SyncState;
        setSync(st);
        if (st.state === "done" || st.state === "error") {
          clearInterval(poll);
          setSyncing(false);
          setTimeout(() => { loadCounts(); loadLogs(); }, 4000);
        }
      } catch { /* keep polling */ }
    }, 2500);
  }

  /* ── purge ── */
  async function purge(table: string) {
    setPurging(table);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001"}/debug/purge/${table}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const d = await res.json() as { message?: string; error?: string };
      setPurgeMsg(p => ({ ...p, [table]: d.message ?? d.error ?? "Hecho" }));
      loadCounts();
    } catch (e) { setPurgeMsg(p => ({ ...p, [table]: String(e) })); }
    finally { setPurging(null); }
  }

  /* ── delete PR ── */
  async function deletePr() {
    if (!prSearch.trim()) return;
    const r = await api.deletePr(prSearch.trim());
    setPrDelMsg(r.message ?? r.error ?? "Hecho");
    loadPrs();
  }

  /* ── summary stats ── */
  const totalCorrupt = counts
    ? Object.values(counts.tables).reduce((s, t) => s + (t.corrupt_rows ?? 0), 0)
    : 0;
  const tokenOk = token?.file_exists && token?.has_token && token?.has_refresh;

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--c-main) transparent transparent transparent" }} />
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Header */}
        <div>
          <p className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: "var(--c-hl)" }}>Sistema</p>
          <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Panel de control</h1>
        </div>

        {/* Status bar */}
        <div className="grid grid-cols-3 gap-2">
          <StatusPill
            label="Token Google"
            value={tokenOk ? "OK" : "Error"}
            ok={!!tokenOk}
            sub={token?.expiry ? `exp ${token.expiry.slice(11, 16)}` : ""}
          />
          <StatusPill
            label="Datos corruptos"
            value={totalCorrupt === 0 ? "Limpio" : `${totalCorrupt} filas`}
            ok={totalCorrupt === 0}
            sub={totalCorrupt > 0 ? "ver pestaña Datos" : ""}
          />
          <StatusPill
            label="Último sync"
            value={sync?.state === "done" ? "Completado" : sync?.state === "running" ? "En curso" : "—"}
            ok={sync?.state === "done"}
            sub={sync?.step?.slice(0, 24) ?? ""}
          />
        </div>

        {error && (
          <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)", color: "#FF3B30" }}>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "var(--surface)" }}>
          {(["data", "sync", "prs", "logs"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={tab === t
                ? { background: "var(--c-main)", color: "white" }
                : { color: "var(--text-muted)" }}>
              {{ data: "📊 Datos", sync: "🔄 Sync", prs: "🏆 Records", logs: "📋 Logs" }[t]}
            </button>
          ))}
        </div>

        {/* ── TAB: DATOS ── */}
        {tab === "data" && (
          <div className="space-y-2">
            {countsLoading && (
              <div className="flex items-center gap-3 py-6 justify-center">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "var(--c-main) transparent transparent transparent" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Leyendo Google Sheets... puede tardar ~15s</p>
              </div>
            )}
            {!countsLoading && counts
              ? Object.entries(counts.tables).map(([table, info]) => {
                  const corrupt = info.corrupt_rows ?? 0;
                  const hasErr  = !!info.error;
                  return (
                    <div key={table} className="rounded-2xl p-4 space-y-2"
                      style={{ background: "var(--surface)", border: `1px solid ${corrupt > 0 ? "rgba(255,59,48,0.3)" : hasErr ? "rgba(255,159,10,0.3)" : "var(--border-col)"}` }}>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{TABLE_ICONS[table] ?? "📄"}</span>
                          <div>
                            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{TABLE_LABELS[table] ?? table}</p>
                            {TABLE_BOUNDS[table] && <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{TABLE_BOUNDS[table]}</p>}
                          </div>
                        </div>
                        <span className="text-base font-black" style={{ color: hasErr ? "#FF9F0A" : info.count > 0 ? "var(--c-main)" : "var(--text-muted)" }}>
                          {hasErr ? "⚠️" : `${info.count}`}
                        </span>
                      </div>

                      {hasErr && <p className="text-[10px] leading-relaxed" style={{ color: "#FF9F0A" }}>{info.error}</p>}

                      {info.last && !hasErr && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {Object.entries(info.last).map(([k, v]) => (
                            <span key={k} className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {k}: <strong style={{ color: "var(--text-primary)" }}>{String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      )}

                      {corrupt > 0 && (
                        <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.15)" }}>
                          <p className="text-xs font-semibold" style={{ color: "#FF3B30" }}>⚠️ {corrupt} filas fuera de rango</p>
                          {info.corrupt_examples?.map((ex, i) => (
                            <p key={i} className="text-[10px]" style={{ color: "#FF3B30" }}>{ex.date}: {ex.issues.join(", ")}</p>
                          ))}
                          {table in TABLE_BOUNDS && (
                            <button onClick={() => purge(table)} disabled={purging === table}
                              className="mt-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-50"
                              style={{ background: "#FF3B30" }}>
                              {purging === table ? "Eliminando..." : `Eliminar ${corrupt} filas corruptas`}
                            </button>
                          )}
                          {purgeMsg[table] && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{purgeMsg[table]}</p>}
                        </div>
                      )}
                    </div>
                  );
                })
              : (!countsLoading && <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin datos aún</p>)
            }
            <button onClick={loadCounts} className="w-full py-2.5 rounded-xl text-xs"
              style={{ background: "var(--surface)", border: "1px solid var(--border-col)", color: "var(--text-muted)" }}>
              ↻ Actualizar datos
            </button>
          </div>
        )}

        {/* ── TAB: SYNC ── */}
        {tab === "sync" && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>Rango de días</p>
              <div className="flex gap-2 mb-4">
                {[7, 30, 60, 90].map(d => (
                  <button key={d} onClick={() => setSyncDays(d)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={syncDays === d
                      ? { background: "var(--c-main)", color: "white" }
                      : { background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border-col)" }}>
                    {d}d
                  </button>
                ))}
              </div>
              <button onClick={triggerSync} disabled={syncing}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,var(--c-main),var(--c-light))", boxShadow: "0 0 16px var(--c-glow)" }}>
                {syncing ? "Sincronizando..." : `Sincronizar ${syncDays} días`}
              </button>
            </div>

            {sync && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border-col)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${sync.pct ?? 0}%`, background: "linear-gradient(90deg,var(--c-main),var(--c-hl))" }} />
                  </div>
                  <span className="text-xs font-black w-10 text-right" style={{ color: "var(--c-main)" }}>{sync.pct ?? 0}%</span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sync.step}</p>

                {sync.details && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(sync.details).map(([key, info]) => (
                      <div key={key} className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
                        <p className="text-[9px] uppercase tracking-widest mb-1 font-semibold" style={{ color: "var(--text-muted)" }}>{key}</p>
                        {info.error
                          ? <p className="text-[10px] font-semibold leading-tight" style={{ color: "#FF3B30" }}>❌ {String(info.error)}</p>
                          : info.skipped
                          ? <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>omitido</p>
                          : <p className="text-xs">
                              <span style={{ color: "var(--c-main)" }}>{String(info.fetched ?? "?")} de Google</span>
                              {" · "}
                              <span style={{ color: "#00C950" }}>+{String(info.new ?? 0)} nuevos</span>
                            </p>
                        }
                      </div>
                    ))}
                  </div>
                )}

                {sync.state === "error" && (
                  <p className="text-xs p-3 rounded-xl" style={{ background: "rgba(255,59,48,0.08)", color: "#FF3B30" }}>
                    {sync.error}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PRs ── */}
        {tab === "prs" && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>Eliminar record por ejercicio</p>
              <input
                value={prSearch} onChange={e => setPrSearch(e.target.value)}
                placeholder="ej: Shoulder Press"
                className="w-full px-3 py-2.5 rounded-xl text-sm mb-3 focus:outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--c-main)", color: "var(--text-primary)" }}
              />
              <button onClick={deletePr}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "#FF3B30" }}>
                Eliminar PRs que contengan ese nombre
              </button>
              {prDelMsg && <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{prDelMsg}</p>}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Todos los records · {prs.length} ejercicios</p>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border-col)", maxHeight: 360, overflowY: "auto" }}>
                {prs.length === 0
                  ? <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Sin records guardados</p>
                  : prs.map((pr, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{pr.exercise}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{pr.date}</p>
                      </div>
                      <span className="text-base font-black" style={{ color: "var(--c-hl)" }}>{pr.pr_weight} kg</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: LOGS ── */}
        {tab === "logs" && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                logs/app.log · {logs.length} líneas
              </p>
              <button onClick={loadLogs}
                className="text-[10px] px-3 py-1 rounded-lg"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border-col)" }}>
                ↻ Refrescar
              </button>
            </div>
            <div ref={logsRef} className="font-mono text-[10px] leading-5 overflow-y-auto p-3 space-y-px"
              style={{ maxHeight: 480, background: "#0a0a0a" }}>
              {logs.length === 0
                ? <p style={{ color: "#555" }}>Sin logs. El archivo se crea al arrancar el backend.</p>
                : logs.map((line, i) => (
                  <p key={i} style={{ color: logColor(line), wordBreak: "break-all" }}>{line}</p>
                ))
              }
            </div>
          </div>
        )}

      </main>
    </AppShell>
  );
}

function StatusPill({ label, value, ok, sub }: { label: string; value: string; ok: boolean; sub?: string }) {
  return (
    <div className="rounded-2xl p-3 space-y-1" style={{ background: "var(--surface)", border: `1px solid ${ok ? "rgba(0,201,80,0.2)" : "rgba(255,59,48,0.2)"}` }}>
      <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-sm font-black" style={{ color: ok ? "#00C950" : "#FF3B30" }}>{value}</p>
      {sub && <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}
