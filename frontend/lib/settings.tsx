"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type SectionKey = "dashboard" | "sleep" | "activity" | "heart-rate" | "workouts" | "body";

export type Section = {
  key: SectionKey;
  label: string;
  icon: string;
  href: string;
  locked?: boolean; // cannot be hidden
};

export const ALL_SECTIONS: Section[] = [
  { key: "dashboard",  label: "Inicio",    icon: "⊞",  href: "/dashboard",  locked: true },
  { key: "sleep",      label: "Sueño",     icon: "🌙",  href: "/sleep" },
  { key: "activity",   label: "Actividad", icon: "👟",  href: "/activity" },
  { key: "heart-rate", label: "Pulso",     icon: "❤️",  href: "/heart-rate" },
  { key: "workouts",   label: "Entrenos",  icon: "💪",  href: "/workouts" },
  { key: "body",       label: "Cuerpo",    icon: "⚖️",  href: "/body" },
];

export type Settings = {
  visibleSections: SectionKey[];
  stepGoal: number;
  calGoal: number;
  sleepGoalH: number;
};

export const DEFAULT_SETTINGS: Settings = {
  visibleSections: ["dashboard", "sleep", "activity", "heart-rate", "workouts", "body"],
  stepGoal: 8000,
  calGoal: 2000,
  sleepGoalH: 8,
};

type SettingsCtx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  visibleSections: Section[];
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

const Ctx = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
  visibleSections: ALL_SECTIONS,
  settingsOpen: false,
  openSettings: () => {},
  closeSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("app_settings");
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem("app_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const visibleSections = ALL_SECTIONS.filter(s =>
    s.locked || settings.visibleSections.includes(s.key)
  );

  return (
    <Ctx.Provider value={{
      settings,
      update,
      visibleSections,
      settingsOpen,
      openSettings:  () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() { return useContext(Ctx); }
