"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Phase = "confirm" | "running" | "done" | "error";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

export default function SyncModal({ open, onClose, onDone }: Props) {
  const [phase, setPhase]   = useState<Phase>("confirm");
  const [pct, setPct]       = useState(0);
  const [step, setStep]     = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [days, setDays]     = useState(30);
  const pollRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setPhase("confirm");
      setPct(0);
      setStep("");
      setErrMsg("");
      stopPoll();
    }
  }, [open]);

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function startSync() {
    setPhase("running");
    setPct(0);
    setStep("Iniciando...");

    try {
      await api.sync(days);
    } catch {
      setPhase("error");
      setErrMsg("No se pudo conectar con el servidor.");
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const s = await api.syncStatus();
        setPct(s.pct);
        setStep(s.step);
        if (s.state === "done") {
          stopPoll();
          setPhase("done");
          setTimeout(() => { onDone(); onClose(); }, 1800);
        } else if (s.state === "error") {
          stopPoll();
          setPhase("error");
          setErrMsg(s.error ?? "Error desconocido");
        }
      } catch { /* network blip, keep polling */ }
    }, 1500);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      onClick={phase === "confirm" ? onClose : undefined}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

      <div
        className="relative w-full md:max-w-sm md:rounded-3xl rounded-t-3xl animate-fade-up p-6 space-y-5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-col)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5), 0 0 20px var(--c-glow)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* LED strip */}
        <div className="absolute top-0 left-8 right-8 h-px rounded-full"
          style={{ background: "linear-gradient(90deg,transparent,var(--c-main) 50%,transparent)" }} />

        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "var(--border-col)" }} />

        {/* ── Confirm ── */}
        {phase === "confirm" && (
          <>
            <div className="text-center space-y-2">
              <div className="text-4xl">↻</div>
              <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Sincronizar datos</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Descargará los últimos <strong style={{ color: "var(--text-primary)" }}>{days} días</strong> de Google Health y Hevy.
              </p>
            </div>

            {/* Days selector */}
            <div className="flex items-center justify-center gap-3">
              {[7, 14, 30, 60].map(d => (
                <button key={d}
                  onClick={() => setDays(d)}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: days === d ? "var(--c-main)" : "var(--surface-2)",
                    border: `1px solid ${days === d ? "var(--c-light)" : "var(--border-col)"}`,
                    color: days === d ? "white" : "var(--text-muted)",
                    boxShadow: days === d ? "0 0 10px var(--c-glow)" : "none",
                  }}>
                  {d}d
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={onClose}
                className="py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-col)", color: "var(--text-muted)" }}>
                Cancelar
              </button>
              <button onClick={startSync}
                className="py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,var(--c-main),var(--c-light))", boxShadow: "0 0 16px var(--c-glow)" }}>
                Sincronizar
              </button>
            </div>
          </>
        )}

        {/* ── Running ── */}
        {phase === "running" && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Sincronizando...</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{step || "Iniciando..."}</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <span>Progreso</span>
                <span className="font-bold" style={{ color: "var(--c-main)" }}>{pct}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, var(--c-main), var(--c-light), var(--c-hl))",
                    boxShadow: "0 0 8px var(--c-glow)",
                  }}
                />
              </div>
            </div>

            {/* Steps list */}
            <div className="space-y-1.5">
              {[
                { label: "Actividad",           threshold: 20 },
                { label: "Frecuencia cardíaca", threshold: 40 },
                { label: "Sueño",               threshold: 60 },
                { label: "Entrenos (Hevy)",     threshold: 85 },
              ].map(s => {
                const done   = pct >= s.threshold;
                const active = pct >= s.threshold - 20 && pct < s.threshold;
                return (
                  <div key={s.label} className="flex items-center gap-2.5 px-1">
                    <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px]"
                      style={{
                        background: done ? "var(--c-main)" : active ? "var(--c-active-bg)" : "var(--surface-2)",
                        border: `1px solid ${done ? "var(--c-light)" : active ? "var(--c-active-brd)" : "var(--border-col)"}`,
                        transition: "all 0.4s ease",
                      }}>
                      {done ? "✓" : active ? "·" : ""}
                    </div>
                    <span className="text-xs" style={{ color: done ? "var(--text-primary)" : active ? "var(--c-main)" : "var(--text-muted)" }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {phase === "done" && (
          <div className="text-center space-y-3 py-2">
            <div className="text-5xl">✅</div>
            <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>¡Sincronizado!</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Los datos están actualizados.</p>
          </div>
        )}

        {/* ── Error ── */}
        {phase === "error" && (
          <div className="text-center space-y-3 py-2">
            <div className="text-5xl">❌</div>
            <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Error al sincronizar</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{errMsg}</p>
            <button onClick={onClose}
              className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,var(--c-main),var(--c-light))" }}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
