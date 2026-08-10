"use client";

import { useEffect } from "react";

const POLL_MS = 60_000;

/**
 * Cuando hay un deploy nuevo en Vercel, recarga la app en todos los clientes
 * (incluye “Añadir a inicio” / PWA) sin reinstalar.
 */
export function DeployRefresh() {
  useEffect(() => {
    const builtVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
    let cancelled = false;

    // Limpia service workers viejos de instalaciones anteriores.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
    }
    if ("caches" in window) {
      caches.keys().then((keys) => {
        for (const key of keys) void caches.delete(key);
      });
    }

    async function check() {
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { version?: string };
        const live = data.version;
        if (live && live !== builtVersion) {
          // Hard reload para tomar HTML/JS/CSS del deploy nuevo.
          window.location.reload();
        }
      } catch {
        // sin red: ignorar
      }
    }

    void check();
    const id = window.setInterval(check, POLL_MS);

    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
