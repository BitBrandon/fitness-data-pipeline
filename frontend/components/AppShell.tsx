"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "./Nav";
import RadialMenu from "./RadialMenu";
import BotGuide from "./BotGuide";
import SettingsModal from "./SettingsModal";
import SyncModal from "./SyncModal";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const username = typeof window !== "undefined" ? (localStorage.getItem("username") ?? "") : "";
  const [syncOpen, setSyncOpen] = useState(false);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    router.replace("/login");
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav
        username={username}
        onSync={() => setSyncOpen(true)}
        onLogout={logout}
      />
      <div className="md:pl-56 pt-12 md:pt-0 pb-28 md:pb-0">
        {children}
      </div>
      <RadialMenu />
      <BotGuide />
      <SettingsModal />
      <SyncModal
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        onDone={() => window.location.reload()}
      />
    </div>
  );
}
