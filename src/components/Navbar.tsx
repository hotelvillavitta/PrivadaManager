"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { BrandLogo } from "@/components/BrandLogo";
import {
  NotificationBell,
  type NavNotification,
} from "@/components/NotificationBell";

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
  notifications,
  privadaName,
}: {
  user: NavUser;
  unread: number;
  notifications: NavNotification[];
  privadaName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const links =
    user?.role === "ADMIN"
      ? [...baseLinks, { href: "/admin", label: "Admin", icon: Shield }]
      : baseLinks;
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <BrandLogo
            variant="mark"
            className="h-11 w-11 rounded-xl shadow-sm ring-1 ring-border"
            priority
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-lg text-primary-dark">
              {privadaName}
            </p>
            <p className="text-xs font-medium tracking-wide text-accent">
              Portal residencial
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-2xl border border-border bg-background/80 p-1 xl:flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? "bg-primary font-semibold text-white shadow-sm"
                    : "font-medium text-muted hover:bg-surface hover:text-primary-dark"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                    active ? "bg-white/15" : "bg-primary-soft text-primary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <NotificationBell unread={unread} items={notifications} />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-dark">
                  {user.firstName}
                </p>
                <span
                  className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                    user.role === "ADMIN"
                      ? "bg-primary text-white"
                      : "bg-primary-soft text-primary"
                  }`}
                >
                  {user.role === "ADMIN" ? "Admin" : "Colono"}
                </span>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => logoutAction())}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium text-muted transition hover:border-primary/30 hover:bg-primary-soft hover:text-primary-dark disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
            >
              Ingresar
            </Link>
          )}

          <button
            type="button"
            className="rounded-full border border-border bg-surface p-2.5 text-primary-dark hover:bg-primary-soft xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-surface px-4 py-3 shadow-inner xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1.5">
            {links.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                    active
                      ? "bg-primary font-semibold text-white"
                      : "font-medium text-foreground hover:bg-primary-soft"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      active
                        ? "bg-white/15"
                        : "bg-primary-soft text-primary"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
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
