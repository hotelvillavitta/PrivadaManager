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
import { useEffect, useState, useTransition } from "react";
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

const mobilePrimaryHrefs = new Set([
  "/",
  "/noticias",
  "/reservaciones",
  "/cuotas",
]);

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

  const moreLinks = links.filter(({ href }) => !mobilePrimaryHrefs.has(href));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (pathname === "/login") return null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandLogo
              variant="mark"
              className="h-10 w-10 rounded-xl shadow-sm ring-1 ring-border sm:h-11 sm:w-11"
              priority
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-lg font-semibold tracking-tight text-primary-dark sm:text-xl">
                {privadaName}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent sm:text-[11px]">
                App Residencial
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:border-primary/30 hover:bg-primary-soft hover:text-primary-dark disabled:opacity-60 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
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
              className="hidden rounded-full border border-border bg-surface p-2.5 text-primary-dark hover:bg-primary-soft md:inline-flex xl:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menú"
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menú tablet (md–xl): debajo del header */}
        {open && (
          <nav className="hidden border-t border-border bg-surface px-4 py-3 shadow-inner md:block xl:hidden">
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

      {/* Menú móvil “Más”: sheet sobre la barra inferior (fuera del header) */}
      {open && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-primary-dark/40"
            onClick={() => setOpen(false)}
          />
          <nav
            className="absolute inset-x-0 bottom-0 max-h-[min(75dvh,32rem)] overflow-y-auto rounded-t-3xl border border-border bg-surface px-4 pb-[calc(7.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_50px_-20px_rgba(47,29,45,0.45)]"
            aria-label="Más opciones"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg text-primary-dark">Más</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border p-2 text-muted"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 pb-2">
              {moreLinks.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm ${
                      active
                        ? "bg-primary font-semibold text-white"
                        : "font-medium text-foreground bg-background"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
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
              {user && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    startTransition(() => logoutAction());
                  }}
                  className="mt-1 flex items-center gap-3 rounded-xl border border-border px-3 py-3.5 text-sm font-medium text-muted"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-muted">
                    <LogOut className="h-4 w-4" />
                  </span>
                  Cerrar sesión
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      {user && (
        <nav
          className="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-surface/95 px-1.5 pb-[max(0.9rem,calc(env(safe-area-inset-bottom)+0.45rem))] pt-2 shadow-[0_-8px_30px_-20px_rgba(47,29,45,0.5)] backdrop-blur md:hidden"
          aria-label="Navegación principal"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
            {links
              .filter(({ href }) => mobilePrimaryHrefs.has(href))
              .map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                const shortLabel =
                  href === "/reservaciones" ? "Reservas" : label;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition ${
                      active
                        ? "bg-primary-soft text-primary"
                        : "text-muted active:bg-background"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`}
                    />
                    <span>{shortLabel}</span>
                  </Link>
                );
              })}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition ${
                open ? "bg-primary-soft text-primary" : "text-muted"
              }`}
              aria-expanded={open}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              <span>Más</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
