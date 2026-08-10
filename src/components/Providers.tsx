"use client";

import { SessionProvider } from "next-auth/react";
import { ToastHost } from "@/components/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <ToastHost />
    </SessionProvider>
  );
}
