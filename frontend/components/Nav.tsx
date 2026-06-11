"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MonsterLogo from "./MonsterLogo";
import { useTheme } from "@/lib/theme";

const SECTIONS = [
  { href: "/dashboard",   label: "Inicio",      icon: "⊞" },
  { href: "/sleep",       label: "Sueño",       icon: "🌙" },
  { href: "/activity",    label: "Actividad",   icon: "👟" },
  { href: "/heart-rate",  label: "Pulso",       icon: "❤️" },
  { href: "/workouts",    label: "Entrenos",    icon: "💪" },
  { href: "/body",        label: "Cuerpo",      icon: "⚖️" },
];

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active ? "bg-[#8B0057]/20 border border-[#8B0057]/40" : "hover:bg-[#8B0057]/10"
      }`}
      style={{ color: active ? "var(--text-primary)" : "var(--text-muted)" }}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="font-medium">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FFD600]" />}
    </Link>
  );
}

export default function Nav({ username, onSync, onLogout, syncing, syncMsg }: {
  username: string;
  onSync: () => void;
  onLogout: () => void;
  syncing: boolean;
  syncMsg: string;
}) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 min-h-screen fixed left-0 top-0 z-20"
        style={{ background: "var(--bg-nav)", borderRight: "1px solid var(--border-col)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5" style={{ borderBottom: "1px solid var(--border-col)" }}>
          <MonsterLogo size={30} />
          <div>
            <span className="block text-sm font-black uppercase tracking-widest leading-none"
              style={{ color: "var(--text-primary)", textShadow: "0 0 6px #8B0057, 0 0 14px #8B0057, 0 0 28px #620040, 0 0 50px rgba(139,0,87,0.4)" }}>
              Monster
            </span>
            <span className="block text-xs font-black uppercase tracking-[0.3em] text-[#FFD600] leading-none"
              style={{ textShadow: "0 0 6px #FFD600, 0 0 14px rgba(255,214,0,0.5)" }}>
              Fit
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {SECTIONS.map(s => (
            <NavItem key={s.href} {...s} active={pathname === s.href} />
          ))}
        </nav>

        {/* User + actions */}
        <div className="px-3 py-4 space-y-2" style={{ borderTop: "1px solid var(--border-col)" }}>
          {syncMsg && <p className="text-xs text-[#FFD600] text-center">{syncMsg}</p>}
          <button
            onClick={onSync}
            disabled={syncing}
            className="w-full text-xs bg-[#8B0057]/20 hover:bg-[#8B0057]/30 border border-[#8B0057]/40 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            style={{ color: "var(--text-primary)" }}
          >
            {syncing ? "Sincronizando…" : "↻ Sincronizar datos"}
          </button>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>@{username}</span>
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={toggle}
                className="text-sm hover:opacity-80 transition-opacity"
                title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
              <button
                onClick={onLogout}
                className="text-xs hover:text-[#FF3B30] transition-colors px-2 py-1 rounded-lg"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border-col)" }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-20 h-12 flex items-center justify-between px-4"
        style={{ background: "var(--bg-nav)", borderBottom: "1px solid var(--border-col)" }}
      >
        <div className="flex items-center gap-2">
          <MonsterLogo size={24} />
          <span className="text-sm font-black uppercase tracking-widest"
            style={{ color: "var(--text-primary)", textShadow: "0 0 6px #8B0057, 0 0 16px #8B0057, 0 0 30px rgba(139,0,87,0.4)" }}>
            Monster <span className="text-[#FFD600]" style={{ textShadow: "0 0 6px #FFD600, 0 0 12px rgba(255,214,0,0.5)" }}>Fit</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {syncMsg && <span className="text-xs text-[#FFD600]">{syncMsg}</span>}
          <button onClick={toggle} className="text-sm" title="Cambiar tema">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button onClick={onSync} disabled={syncing} className="text-xs disabled:opacity-50" style={{ color: "var(--text-muted)" }}>
            {syncing ? "…" : "↻"}
          </button>
          <button onClick={onLogout} className="text-xs font-medium text-[#FF3B30]">Salir</button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex"
        style={{ background: "var(--bg-nav)", borderTop: "1px solid var(--border-col)" }}
      >
        {SECTIONS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors"
            style={{ color: pathname === s.href ? "var(--text-primary)" : "var(--text-muted)" }}
          >
            <span className="text-base">{s.icon}</span>
            <span className="text-[9px] leading-none">{s.label}</span>
            {pathname === s.href && <span className="w-1 h-1 rounded-full bg-[#FFD600]" />}
          </Link>
        ))}
      </nav>
    </>
  );
}
