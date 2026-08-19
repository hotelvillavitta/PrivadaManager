"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const STORAGE_KEY = "grenache-install-prompt";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua);
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return ios && safari;
}

function wasDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dismissed";
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, "dismissed");
  } catch {
    // ignore
  }
}

/**
 * Primera visita: invita a instalar la app en el dispositivo.
 * Chrome/Android usa beforeinstallprompt; iOS muestra instrucciones de Safari.
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"native" | "ios" | "manual">("manual");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("native");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const timer = window.setTimeout(() => {
      if (isStandalone() || wasDismissed()) return;
      setVisible((already) => {
        if (already) return already;
        if (isIosSafari()) {
          setMode("ios");
          return true;
        }
        // Otros navegadores: tip manual si aún no llegó el evento nativo.
        setMode("manual");
        return true;
      });
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  function dismiss() {
    markDismissed();
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    markDismissed();
    setVisible(false);
    void choice;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[60] p-3 md:bottom-0 md:p-4 md:pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-lg gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-[0_20px_50px_-18px_rgba(47,29,45,0.55)] sm:p-4">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-black/20 sm:h-12 sm:w-12">
          <Image
            src="/brand/grenache-logo.png"
            alt=""
            width={96}
            height={96}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary-dark">
            Instala Grenaché en tu teléfono
          </p>
          {mode === "ios" ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              En Safari toca{" "}
              <Share className="inline h-3.5 w-3.5 text-primary" />{" "}
              <strong>Compartir</strong> y luego{" "}
              <strong>Añadir a pantalla de inicio</strong>.
            </p>
          ) : mode === "native" ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Accede más rápido como app, con el icono en tu pantalla de inicio.
            </p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              En el menú del navegador elige{" "}
              <strong>Instalar aplicación</strong> o{" "}
              <strong>Añadir a la pantalla de inicio</strong>.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {mode === "native" && deferred && (
              <button
                type="button"
                onClick={() => void install()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Instalar
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-background"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-background"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
