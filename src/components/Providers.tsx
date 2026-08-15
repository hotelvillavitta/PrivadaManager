"use client";

import { SessionProvider } from "next-auth/react";
import { DeployRefresh } from "@/components/DeployRefresh";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ToastHost } from "@/components/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus refetchInterval={60}>
      <DeployRefresh />
      {children}
      <InstallPrompt />
      <ToastHost />
    </SessionProvider>
  );
}
