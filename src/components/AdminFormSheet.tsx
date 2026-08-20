"use client";

import { useEffect } from "react";

/** Panel fijo bajo el header para editar/crear sin depender del scroll. */
export function AdminFormSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-primary-dark/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        className="relative z-[1] mx-auto w-full max-w-4xl px-3 pt-[calc(4.75rem+env(safe-area-inset-top))] pb-[calc(7.5rem+env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
      >
        <div className="max-h-[calc(100dvh-7.5rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-[0_24px_60px_-24px_rgba(47,29,45,0.55)] sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
