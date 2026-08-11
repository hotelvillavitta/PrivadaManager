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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, #efe8ef, transparent), radial-gradient(ellipse 60% 40% at 100% 100%, #e8efe9, transparent)",
        }}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-[0_20px_60px_-30px_rgba(63,42,60,0.35)]">
        <div className="mb-8 text-center">
          <BrandLogo
            variant="full"
            className="mx-auto mb-5 w-full max-w-[280px] rounded-2xl"
            priority
          />
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Bienvenido
          </p>
          <h1 className="mt-2 font-display text-3xl text-primary-dark">
            Grenaché
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
              <div className="grid grid-cols-2 gap-3">
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
