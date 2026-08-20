"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { completePasswordReset } from "@/lib/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

type State = { error?: string; ok?: boolean } | undefined;

async function resetAction(_prev: State, formData: FormData): Promise<State> {
  return completePasswordReset(formData);
}

export function CambiarContrasenaForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, formAction, pending] = useActionState(resetAction, undefined);

  if (!token) {
    return (
      <p className="text-center text-sm text-muted">
        Este enlace no es válido. Desde el inicio de sesión pide un correo para
        cambiar la contraseña.
      </p>
    );
  }

  if (state?.ok) {
    return (
      <div className="text-center">
        <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          Contraseña actualizada. Ya puedes entrar con ella.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Nueva contraseña</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoComplete="new-password"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Confirmar</span>
        <input
          type="password"
          name="confirm"
          required
          minLength={8}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoComplete="new-password"
        />
      </label>
      {state?.error && (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}

export function CambiarContrasenaShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <BrandLogo
          variant="mark"
          className="mx-auto mb-4 h-16 w-16 rounded-full bg-white object-cover ring-1 ring-border"
          priority
        />
        <h1 className="mb-1 text-center font-display text-2xl text-primary-dark">
          Elige tu contraseña
        </h1>
        <p className="mb-6 text-center text-sm text-muted">
          Mínimo 8 caracteres. Después entra con tu correo y esta clave.
        </p>
        {children}
      </div>
    </div>
  );
}
