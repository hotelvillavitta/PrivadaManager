"use client";

import { useActionState, useState } from "react";
import { loginAction, requestPasswordReset } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";

type AuthState = { error?: string; ok?: boolean; message?: string } | undefined;

async function loginFormAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  return loginAction(formData);
}

async function resetFormAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  return requestPasswordReset(formData);
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [loginState, loginForm, loginPending] = useActionState(
    loginFormAction,
    undefined,
  );
  const [resetState, resetForm, resetPending] = useActionState(
    resetFormAction,
    undefined,
  );

  const pending = mode === "login" ? loginPending : resetPending;
  const error = mode === "login" ? loginState?.error : resetState?.error;

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-3 py-5 sm:px-4 sm:py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, #efe4ec, transparent), radial-gradient(ellipse 60% 40% at 100% 100%, #ebe3da, transparent)",
        }}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-surface p-5 shadow-[0_20px_60px_-30px_rgba(63,42,60,0.35)] sm:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <BrandLogo
            variant="full"
            className="mx-auto mb-5 h-36 w-36 rounded-full bg-white object-cover shadow-[0_16px_40px_-18px_rgba(47,29,45,0.35)] ring-1 ring-border sm:mb-6 sm:h-44 sm:w-44"
            priority
          />
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Fraccionamiento Viñas del Mar
          </p>
          <h1 className="mt-2 font-display text-3xl text-primary-dark">
            Bienvenido
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "login"
              ? "Ingresa tus credenciales para acceder al portal."
              : "Te enviamos un enlace a tu correo para elegir una nueva contraseña."}
          </p>
        </div>

        {mode === "reset" && resetState?.ok ? (
          <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
            {resetState.message}
          </p>
        ) : (
          <form
            action={mode === "login" ? loginForm : resetForm}
            className="space-y-4"
            key={mode}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Correo electrónico
              </span>
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoComplete="email"
              />
            </label>
            {mode === "login" && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Contraseña
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoComplete="current-password"
                />
              </label>
            )}

            {error && (
              <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              {pending
                ? "Procesando…"
                : mode === "login"
                  ? "Ingresar"
                  : "Enviar enlace"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => setMode((m) => (m === "login" ? "reset" : "login"))}
          className="mt-5 w-full text-center text-sm text-muted hover:text-primary"
        >
          {mode === "login"
            ? "¿Olvidaste tu contraseña? Cámbiala por correo"
            : "Volver a iniciar sesión"}
        </button>
      </div>
    </div>
  );
}
