"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Nav from "./Nav";
import { api } from "@/lib/api";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const username = typeof window !== "undefined" ? (localStorage.getItem("username") ?? "") : "";
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      await api.sync();
      setSyncMsg("Sync iniciado ✓");
      setTimeout(() => setSyncMsg(""), 3000);
    } catch {
      setSyncMsg("Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    router.replace("/login");
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav username={username} onSync={handleSync} onLogout={logout} syncing={syncing} syncMsg={syncMsg} />
      <div className="md:pl-56 pt-12 md:pt-0 pb-16 md:pb-0">
        {children}
      </div>
    </div>
  );
}
