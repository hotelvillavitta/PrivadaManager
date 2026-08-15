"use client";

import { useEffect } from "react";

const POLL_MS = 60_000;

/**
 * Cuando hay un deploy nuevo en Vercel, recarga la app en todos los clientes
 * (incluye “Añadir a inicio” / PWA) sin reinstalar.
 * También registra el service worker mínimo para que la app sea instalable.
 */
export function DeployRefresh() {
  useEffect(() => {
    const builtVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
    let cancelled = false;

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("[sw] register failed", err));
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
