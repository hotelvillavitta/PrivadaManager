"use client";

import { useEffect, useRef } from "react";

/**
 * Scrolls (and lightly focuses) a form when `active` becomes truthy —
 * e.g. after tapping edit on a list item farther down the page.
 */
export function useScrollToForm(active: boolean | string | null | undefined) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let attempts = 0;

    const run = () => {
      if (cancelled) return;
      const el = ref.current;
      if (!el) {
        if (attempts++ < 8) requestAnimationFrame(run);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const focusable = el.querySelector<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >(
        "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])",
      );
      focusable?.focus({ preventScroll: true });
    };

    requestAnimationFrame(run);
    return () => {
      cancelled = true;
    };
  }, [active]);

  return ref;
}
