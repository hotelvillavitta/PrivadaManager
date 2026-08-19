import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

type Privada = {
  name: string;
  address: string;
  phone: string;
  email: string;
  tagline: string;
};

export function Footer({ privada }: { privada: Privada }) {
  return (
    <footer className="mt-auto hidden border-t border-border bg-footer md:block">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div>
          <BrandLogo
            variant="mark"
            className="mb-4 h-12 w-12 rounded-xl ring-1 ring-border"
          />
          <p className="mb-1 text-sm font-semibold text-primary-dark">
            {privada.name}
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            {privada.tagline}
          </p>
        </div>

        <div>
          <h3 className="mb-3 font-display text-lg text-primary-dark">
            Navegación
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/" className="hover:text-primary">
                Inicio
              </Link>
            </li>
            <li>
              <Link href="/noticias" className="hover:text-primary">
                Noticias
              </Link>
            </li>
            <li>
              <Link href="/notificaciones" className="hover:text-primary">
                Notificaciones
              </Link>
            </li>
            <li>
              <Link href="/reservaciones" className="hover:text-primary">
                Reservaciones
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-display text-lg text-primary-dark">
            Mi Cuenta
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/cuotas" className="hover:text-primary">
                Cuotas de Mantenimiento
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-primary">
                Ingresar
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-display text-lg text-primary-dark">
            Contacto
          </h3>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {privada.address}
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {privada.phone}
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {privada.email}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {privada.name}. Portal de gestión
        residencial.
      </div>
    </footer>
  );
}
