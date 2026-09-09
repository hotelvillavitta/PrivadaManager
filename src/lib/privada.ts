export type PrivadaSchedule = {
  days: string;
  hours: string;
};

export type Privada = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  tagline: string;
  capacityMax: number;
  capacityNote: string | null;
  schedules: PrivadaSchedule[];
  rules: string[];
  logoUrl: string | null;
  primaryColor: string;
  slug: string | null;
};

export const DEFAULT_PRIVADA_SCHEDULES: PrivadaSchedule[] = [
  { days: "Domingo a Jueves", hours: "12:00 pm - 22:00 pm" },
  { days: "Viernes y Sábado", hours: "12:00 pm - 2:00 am" },
];

export const DEFAULT_PRIVADA_RULES: string[] = [
  "Las reservaciones deben realizarse con al menos una semana de anticipación.",
  "El área común puede reservarse por un máximo de 6 horas consecutivas.",
  "El residente responsable debe estar presente durante todo el evento.",
  "Está prohibido el uso de equipos de sonido después de las 22:00 hrs.",
  "Se debe dejar el área en las mismas condiciones en que se encontró.",
];

export const DEFAULT_PRIVADA: Privada = {
  id: 1,
  name: "Grenache",
  address: "Priv. Grenache 4176, Fracc. Viñas del Mar",
  phone: "+52 (664) 356-4100",
  email: "comitegrenache@gmail.com",
  tagline:
    "Comunidad residencial comprometida con la excelencia y el bienestar de todos sus residentes.",
  capacityMax: 50,
  capacityNote: "Capacidad máxima del salón",
  schedules: DEFAULT_PRIVADA_SCHEDULES,
  rules: DEFAULT_PRIVADA_RULES,
  logoUrl: null,
  primaryColor: "#4f334a",
  slug: "grenache",
};

export function parseSchedulesJson(raw: string | null | undefined): PrivadaSchedule[] {
  if (!raw) return DEFAULT_PRIVADA_SCHEDULES;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_PRIVADA_SCHEDULES;
    }
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const days = String((item as { days?: unknown }).days ?? "").trim();
        const hours = String((item as { hours?: unknown }).hours ?? "").trim();
        if (!days || !hours) return null;
        return { days, hours };
      })
      .filter((x): x is PrivadaSchedule => Boolean(x));
  } catch {
    return DEFAULT_PRIVADA_SCHEDULES;
  }
}

export function parseRulesJson(raw: string | null | undefined): string[] {
  if (!raw) return DEFAULT_PRIVADA_RULES;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_PRIVADA_RULES;
    const rules = parsed
      .map((r) => String(r ?? "").trim())
      .filter(Boolean);
    return rules.length ? rules : DEFAULT_PRIVADA_RULES;
  } catch {
    return DEFAULT_PRIVADA_RULES;
  }
}

export function normalizePrimaryColor(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return DEFAULT_PRIVADA.primaryColor;
}

export function slugifyPrivadaName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "privada";
}

/** Mezcla un color hex con blanco para fondos soft. */
export function softColorFromPrimary(hex: string, mix = 0.88) {
  const c = normalizePrimaryColor(hex).slice(1);
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const mixCh = (ch: number) => Math.round(ch + (255 - ch) * mix);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mixCh(r))}${toHex(mixCh(g))}${toHex(mixCh(b))}`;
}

export function darkColorFromPrimary(hex: string, factor = 0.62) {
  const c = normalizePrimaryColor(hex).slice(1);
  const r = Math.round(parseInt(c.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(c.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(c.slice(4, 6), 16) * factor);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
