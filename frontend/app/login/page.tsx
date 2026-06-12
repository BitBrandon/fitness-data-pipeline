"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, api } from "@/lib/api";
import MonsterLogo from "@/components/MonsterLogo";
import { useTheme } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await login(username.trim().toLowerCase(), password);
      localStorage.setItem("token", token);
      localStorage.setItem("username", username.trim().toLowerCase());
      // Fire sync silently in background — don't await, user goes straight to dashboard
      api.sync(30).catch(() => {});
      router.replace("/dashboard");
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      {/* ambient glow blobs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#8B0057] opacity-[0.07] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-[#FFD600] opacity-[0.03] rounded-full blur-[80px] pointer-events-none" />

      {/* Theme toggle — top right */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 text-xl p-2 rounded-xl transition-all hover:opacity-80"
        style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}
        title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <MonsterLogo size={44} />
            <div className="text-left">
              <span
                className="block text-2xl font-black uppercase tracking-widest leading-none"
                style={{ color: "var(--text-primary)", textShadow: "0 0 6px #8B0057, 0 0 14px #8B0057, 0 0 28px #620040, 0 0 50px rgba(139,0,87,0.4)" }}
              >
                Monster
              </span>
              <span
                className="block text-sm font-black uppercase tracking-[0.35em] text-[#FFD600] leading-none"
                style={{ textShadow: "0 0 6px #FFD600, 0 0 14px rgba(255,214,0,0.5)" }}
              >
                Fit
              </span>
            </div>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Tu dashboard de salud personal</p>
        </div>

        {/* Card with LED glow */}
        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-glow)",
            boxShadow: "0 0 24px rgba(139,0,87,0.2), 0 0 60px rgba(139,0,87,0.08), inset 0 1px 0 rgba(139,0,87,0.25)",
          }}
        >
          {/* top LED strip */}
          <div
            className="absolute top-0 left-8 right-8 h-px rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, #8B0057 30%, #B5006E 50%, #8B0057 70%, transparent)", opacity: 0.8 }}
          />

          <h1 className="text-lg font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Iniciar sesión</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Usuario</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-all"
                style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-col)" }}
                onFocus={e => e.currentTarget.style.borderColor = "#8B0057"}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border-col)")}
                placeholder="brandon"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-all"
                style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-col)" }}
                onFocus={e => e.currentTarget.style.borderColor = "#8B0057"}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border-col)")}
                placeholder="••••••"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-medium rounded-lg py-2.5 text-sm mt-2 transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #8B0057, #620040)",
                color: "white",
                boxShadow: "0 0 16px rgba(139,0,87,0.4), 0 0 32px rgba(139,0,87,0.15)",
                border: "1px solid rgba(181,0,110,0.4)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
