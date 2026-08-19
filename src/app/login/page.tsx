"use client";

import { useState, useActionState } from "react";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";

type AuthState = { error?: string; ok?: boolean } | undefined;

async function loginFormAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  return loginAction(formData);
}

async function registerFormAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  return registerAction(formData);
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginForm, loginPending] = useActionState(
    loginFormAction,
    undefined,
  );
  const [registerState, registerForm, registerPending] = useActionState(
    registerFormAction,
    undefined,
  );

  const pending = mode === "login" ? loginPending : registerPending;
  const error =
    mode === "login" ? loginState?.error : registerState?.error;

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
              : "Crea tu cuenta de residente."}
          </p>
        </div>

        <form
          action={mode === "login" ? loginForm : registerForm}
          className="space-y-4"
          key={mode}
        >
          {mode === "register" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">
                    Nombre
                  </span>
                  <input
                    name="firstName"
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">
                    Apellido
                  </span>
                  <input
                    name="lastName"
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Número de casa
                </span>
                <input
                  name="houseNumber"
                  required
                  placeholder="48"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Correo electrónico
            </span>
            <input
              type="email"
              name="email"
              required
              defaultValue={mode === "login" ? "juan@grenache.mx" : ""}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Contraseña</span>
            <input
              type="password"
              name="password"
              required
              defaultValue={mode === "login" ? "demo1234" : ""}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </label>

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
                : "Crear cuenta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
          className="mt-5 w-full text-center text-sm text-muted hover:text-primary"
        >
          {mode === "login"
            ? "¿No tienes cuenta? Regístrate aquí"
            : "¿Ya tienes cuenta? Inicia sesión"}
        </button>

        <p className="mt-4 text-center text-xs text-muted">
          Demo colono: juan@grenache.mx / demo1234
          <br />
          Demo admin: admin@grenache.mx / demo1234
        </p>
      </div>
    </div>
  );
}
