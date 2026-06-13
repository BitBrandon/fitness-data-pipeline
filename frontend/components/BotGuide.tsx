"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import MonsterLogo from "./MonsterLogo";
import { api } from "@/lib/api";

const WELCOME_KEY = "botguide_welcome_v1";
const WELCOME_MSG = "¡Bienvenido a Monster Fit! 💪 Aquí tienes todos tus datos de salud y entrenamiento en un solo lugar. Seré tu guía personal — si tienes dudas en cualquier pantalla, tócame y te explico qué hay. También puedo analizar tus datos con IA si me preguntas algo.";

const HINTS: Record<string, string> = {
  "/dashboard":  "Aquí ves tu misión de hoy. Los anillos muestran cuánto has cumplido de cada objetivo.",
  "/sleep":      "Tu historial de sueño. Fucsia = profundo, rosa = REM. Son las fases más recuperadoras.",
  "/activity":   "Pasos y calorías por día. La barra te dice cuánto falta para tu meta.",
  "/heart-rate": "Tu frecuencia cardíaca en reposo. Cuanto más baja, mejor forma cardiovascular.",
  "/workouts":   "Todos tus entrenos de Hevy. Records personales arriba. Filtra por ejercicio abajo.",
  "/body":       "Evolución de tu peso. Verde = bajando, rojo = subiendo respecto al inicio.",
};

const POS_KEY = "botguide_pos_v3";
const AVT     = 40;
const MARGIN  = 8;

type Pos = { x: number; y: number };

function defaultPos(): Pos {
  if (typeof window === "undefined") return { x: 0, y: 56 };
  return { x: window.innerWidth - AVT - MARGIN, y: 56 };
}

function loadPos(): Pos | null {
  try {
    const s = localStorage.getItem(POS_KEY);
    if (!s) return null;
    const p = JSON.parse(s) as Pos;
    const W = window.innerWidth, H = window.innerHeight;
    if (p.x >= MARGIN && p.y >= MARGIN && p.x <= W - MARGIN && p.y <= H - MARGIN) return p;
    localStorage.removeItem(POS_KEY);
  } catch { /* ignore */ }
  return null;
}

function savePos(p: Pos) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

type Mode = "hint" | "ai" | "chat";

export default function BotGuide() {
  const pathname = usePathname();
  const [visible,     setVisible]     = useState(false);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);
  const [pos,         setPos]         = useState<Pos>({ x: 0, y: 56 });
  const [dragging,    setDragging]    = useState(false);
  const [isWelcome,   setIsWelcome]   = useState(false);

  const [mode,        setMode]        = useState<Mode>("hint");
  const [aiText,      setAiText]      = useState("");
  const [aiLoading,   setAiLoading]   = useState(false);
  const [question,    setQuestion]    = useState("");

  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const hasMoved  = useRef(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const hint = HINTS[pathname];

  useEffect(() => { setPos(loadPos() ?? defaultPos()); }, []);

  // Welcome on first visit
  useEffect(() => {
    if (!localStorage.getItem(WELCOME_KEY)) {
      const t = setTimeout(() => { setIsWelcome(true); setMode("hint"); setVisible(true); }, 1200);
      return () => clearTimeout(t);
    }
  }, []);

  // Page hint
  useEffect(() => {
    if (!hint || isWelcome) return;
    const key  = `guide_${pathname.replace("/", "") || "dashboard"}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      const t = setTimeout(() => { setMode("hint"); setVisible(true); }, 900);
      setHasBeenSeen(false);
      return () => clearTimeout(t);
    }
    setHasBeenSeen(true);
    setVisible(false);
  }, [pathname, hint, isWelcome]);

  function dismiss() {
    if (isWelcome) {
      localStorage.setItem(WELCOME_KEY, "1");
      setIsWelcome(false);
    } else if (mode === "hint") {
      localStorage.setItem(`guide_${pathname.replace("/", "") || "dashboard"}`, "1");
      setHasBeenSeen(true);
    }
    setVisible(false);
    setMode("hint");
    setQuestion("");
    setAiText("");
  }

  async function openAI() {
    setMode("ai");
    setVisible(true);
    setAiLoading(true);
    setAiText("");
    try {
      const res = await api.aiInsights();
      setAiText(res.response);
    } catch {
      setAiText("No pude conectar con el agente. Comprueba que el servidor está en marcha.");
    } finally {
      setAiLoading(false);
    }
  }

  async function sendQuestion() {
    const q = question.trim();
    if (!q) return;
    setMode("ai");
    setAiLoading(true);
    setAiText("");
    try {
      const res = await api.aiChat(q);
      setAiText(res.response);
    } catch {
      setAiText("Error al procesar tu pregunta.");
    } finally {
      setAiLoading(false);
      setQuestion("");
    }
  }

  // Drag
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    hasMoved.current  = false;
    setDragging(false);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    if (!hasMoved.current && Math.hypot(dx, dy) < 5) return;
    hasMoved.current = true;
    setDragging(true);
    const W = window.innerWidth, H = window.innerHeight;
    setPos({
      x: Math.max(MARGIN, Math.min(W - AVT - MARGIN, dragStart.current.ox + dx)),
      y: Math.max(MARGIN, Math.min(H - AVT - MARGIN, dragStart.current.oy + dy)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    if (dragStart.current) {
      if (hasMoved.current) savePos(pos);
      dragStart.current = null;
    }
    setDragging(false);
  }, [pos]);

  if (!hint && !isWelcome) return null;

  const W       = typeof window !== "undefined" ? window.innerWidth  : 375;
  const H       = typeof window !== "undefined" ? window.innerHeight : 812;
  const BWIDTH  = mode === "chat" || mode === "ai" ? Math.min(300, W - 24) : Math.min(280, W - 24);
  const openLeft = pos.x + BWIDTH > W - 12;
  const openDown = pos.y < H * 0.5;
  const bubbleLeft = openLeft ? -(BWIDTH - AVT) : 0;
  const tailLeft   = openLeft ? BWIDTH - AVT - 4 : 12;

  const bRadius = openDown
    ? openLeft ? "12px 4px 12px 12px" : "4px 12px 12px 12px"
    : openLeft ? "12px 12px 12px 4px" : "12px 12px 4px 12px";

  const displayText = isWelcome ? WELCOME_MSG : hint;

  return (
    <div className="fixed z-50" style={{ left: pos.x, top: pos.y, userSelect: "none" }}>

      {/* Bubble */}
      {visible && !dragging && (
        <div className="bubble-in"
          style={{
            position: "absolute",
            left:   bubbleLeft,
            top:    openDown  ? `calc(100% + 10px)` : "auto",
            bottom: !openDown ? `calc(100% + 10px)` : "auto",
          }}>
          <div style={{
            width: BWIDTH, background: "var(--surface)",
            border: "1px solid var(--c-main)", borderRadius: bRadius,
            boxShadow: "0 0 16px var(--c-glow), 0 4px 12px rgba(0,0,0,0.15)",
            padding: "14px 16px",
            position: "relative",
          }}>
            {/* LED strip */}
            <div className="absolute top-0 left-4 right-4 h-px rounded-full"
              style={{ background: "linear-gradient(90deg,transparent,var(--c-main) 50%,transparent)" }} />

            {/* Close */}
            <button onClick={dismiss}
              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-xs"
              style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}>×</button>

            {/* Content */}
            {(mode === "hint" || isWelcome) && (
              <div>
                <p className="text-xs leading-relaxed pr-5" style={{ color: "var(--text-primary)" }}>
                  {displayText}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={openAI}
                    className="flex-1 text-[10px] font-semibold py-1.5 rounded-xl transition-all active:scale-95"
                    style={{ background: "var(--c-active-bg)", border: "1px solid var(--c-main)", color: "var(--c-main)" }}>
                    ✨ Analizar mis datos
                  </button>
                  <button
                    onClick={() => { setMode("chat"); setVisible(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className="flex-1 text-[10px] font-semibold py-1.5 rounded-xl transition-all active:scale-95"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border-col)", color: "var(--text-muted)" }}>
                    💬 Preguntar
                  </button>
                </div>
              </div>
            )}

            {mode === "ai" && (
              <div>
                <p className="text-[9px] uppercase tracking-widest mb-2 font-semibold" style={{ color: "var(--c-main)" }}>
                  ✨ Análisis IA
                </p>
                {aiLoading ? (
                  <div className="space-y-2">
                    {[80, 100, 60].map((w, i) => (
                      <div key={i} className="h-2.5 rounded-full shimmer" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>{aiText}</p>
                )}
                <button
                  onClick={() => { setMode("chat"); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="mt-3 text-[10px] font-semibold py-1.5 px-3 rounded-xl w-full transition-all active:scale-95"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-col)", color: "var(--text-muted)" }}>
                  💬 Hacer una pregunta
                </button>
              </div>
            )}

            {mode === "chat" && (
              <div>
                <p className="text-[9px] uppercase tracking-widest mb-2 font-semibold" style={{ color: "var(--c-main)" }}>
                  💬 Pregúntame algo
                </p>
                {aiLoading ? (
                  <div className="space-y-2 mb-3">
                    {[90, 70, 50].map((w, i) => (
                      <div key={i} className="h-2.5 rounded-full shimmer" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : aiText ? (
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-primary)" }}>{aiText}</p>
                ) : null}
                <div className="flex gap-1.5">
                  <input
                    ref={inputRef}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendQuestion()}
                    placeholder="Ej: ¿Cómo está mi sueño?"
                    className="flex-1 text-xs px-3 py-2 rounded-xl focus:outline-none"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-col)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <button
                    onClick={sendQuestion}
                    disabled={!question.trim() || aiLoading}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: "var(--c-main)", color: "white" }}>
                    →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tail */}
          <div className="absolute w-3 h-3 rotate-45" style={{
            left:       tailLeft,
            background: "var(--surface)",
            top:        !openDown ? "auto" : "-6px",
            bottom:     openDown  ? "auto" : "-6px",
            borderTop:    openDown  ? "1px solid var(--c-main)" : "none",
            borderLeft:   openDown  && !openLeft ? "1px solid var(--c-main)" : "none",
            borderRight:  openDown  &&  openLeft ? "1px solid var(--c-main)" : "none",
            borderBottom: !openDown && !openLeft ? "1px solid var(--c-main)" : "none",
          }} />
        </div>
      )}

      {/* Avatar */}
      <button
        ref={avatarRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (hasMoved.current) return;
          if (visible) dismiss(); else { setMode("hint"); setVisible(true); setHasBeenSeen(false); }
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 ${dragging ? "" : "float-bob"}`}
        style={{
          background:  "linear-gradient(135deg, var(--c-main), #3a0025)",
          boxShadow:   visible
            ? "0 0 18px var(--c-main), 0 0 36px var(--c-glow)"
            : !hasBeenSeen
            ? "0 0 14px var(--c-glow), 0 0 28px var(--c-glow)"
            : "0 0 10px var(--c-glow)",
          cursor:      dragging ? "grabbing" : "grab",
          touchAction: "none",
        }}>
        <MonsterLogo size={20} />
      </button>

    </div>
  );
}
