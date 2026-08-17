"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

type ToastItem = {
  id: number;
  message: string;
  type: "success" | "error";
};

let pushToast: ((message: string, type?: "success" | "error") => void) | null =
  null;

export function toast(message: string, type: "success" | "error" = "success") {
  pushToast?.(message, type);
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushToast = (message, type = "success") => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-[100] flex flex-col gap-2 md:inset-x-auto md:right-4 md:bottom-4 md:w-[min(360px,calc(100vw-2rem))]">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
            item.type === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-danger/20 bg-danger-soft text-danger"
          }`}
        >
          {item.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p className="flex-1 text-sm font-medium">{item.message}</p>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100"
            onClick={() =>
              setItems((prev) => prev.filter((t) => t.id !== item.id))
            }
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
