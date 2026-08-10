"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Home,
  LogOut,
  Menu,
  Newspaper,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { logoutAction } from "@/lib/actions/auth";

type NavUser = {
  firstName: string;
  lastName: string;
  role: "COLONO" | "ADMIN";
  email: string;
} | null;

const baseLinks = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/noticias", label: "Noticias", icon: Newspaper },
  { href: "/comunidad", label: "Comunidad", icon: Users },
  { href: "/reservaciones", label: "Reservaciones", icon: CalendarDays },
  { href: "/directorio", label: "Directorio", icon: Building2 },
  { href: "/cuotas", label: "Cuotas", icon: Wallet },
  { href: "/finanzas", label: "Finanzas", icon: CircleDollarSign },
];

export function Navbar({
  user,
  unread,
  privadaName,
}: {
  user: NavUser;
  unread: number;
  privadaName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const links =
    user?.role === "ADMIN"
      ? [
          ...baseLinks,
          { href: "/admin", label: "Admin", icon: Shield },
        ]
      : baseLinks;
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-sm">
            G
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg text-primary-dark">{privadaName}</p>
            <p className="text-xs text-muted">Portal residencial</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition ${
                  active
                    ? "bg-primary-soft font-medium text-primary"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/comunidad"
                className="relative rounded-full p-2 text-muted hover:bg-background"
                aria-label="Notificaciones"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium uppercase tracking-wide text-primary-dark">
                  {user.firstName}
                </p>
                <p className="text-[11px] text-muted">
                  {user.role === "ADMIN" ? "Administrador" : "Colono"}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => logoutAction())}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm text-muted transition hover:bg-background hover:text-foreground disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Ingresar
            </Link>
          )}

          <button
            type="button"
            className="rounded-full p-2 text-muted hover:bg-background xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-surface px-4 py-3 xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
                    active
                      ? "bg-primary-soft font-medium text-primary"
                      : "text-muted hover:bg-background"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
