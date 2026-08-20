import { Suspense } from "react";
import {
  CambiarContrasenaForm,
  CambiarContrasenaShell,
} from "./cambiar-contrasena-form";

export default function CambiarContrasenaPage() {
  return (
    <CambiarContrasenaShell>
      <Suspense
        fallback={<p className="text-center text-sm text-muted">Cargando…</p>}
      >
        <CambiarContrasenaForm />
      </Suspense>
    </CambiarContrasenaShell>
  );
}
