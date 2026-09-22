/**
 * Sustituye usuarios placeholder por los reales del PDF Residex.
 * Conserva/crea un admin maestro sin casa: usuario `admin` / contraseña fija.
 *
 *   npx tsx prisma/import-usuarios-pdf.ts
 *   npx tsx prisma/import-usuarios-pdf.ts --apply
 *   USUARIOS_PDF=/ruta/usuarios.pdf npx tsx prisma/import-usuarios-pdf.ts --apply
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateTemporaryPassword } from "../src/lib/passwords";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (opts: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
  };
};

const prisma = new PrismaClient();

const DEFAULT_PDF = "/Users/jcmac15/Downloads/usuarios.pdf";
const MASTER_EMAIL = "admin";
const MASTER_PASSWORD = "240906";

type PdfStatus = "Aprobado" | "Pendiente" | "Rechazado";
type PdfRole = "Colono" | "Comité Vecinal";

type ParsedUser = {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  status: PdfStatus;
  pdfRole: PdfRole;
  houseNumber: string;
  accessCode: string | null;
  gateCode: string | null;
};

function titleCaseName(full: string): { firstName: string; lastName: string } {
  const parts = full
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) =>
      w.toLowerCase().replace(/(^|[-'])\p{L}/gu, (ch) => ch.toUpperCase()),
    );
  if (parts.length === 0) return { firstName: "Residente", lastName: "—" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "—" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function fixEmail(raw: string): string {
  let e = raw.trim().toLowerCase();
  // Typo conocido en el PDF Residex
  if (e.endsWith("@gmail.con")) e = e.replace(/@gmail\.con$/, "@gmail.com");
  return e;
}

function parseCodes(chunk: string): {
  accessCode: string | null;
  gateCode: string | null;
} {
  const peat =
    chunk.match(/PEA?NTONAL\s*(\d+)\s*#/i) ||
    chunk.match(/PEATONAL\s*(\d+)\s*#/i);
  const port = chunk.match(/PORTON\s*(\d+)\s*#/i);
  return {
    accessCode: peat ? `PEATONAL ${peat[1]}#` : null,
    gateCode: port ? `PORTON ${port[1]}#` : null,
  };
}

export function parseUsuariosPdfText(text: string): ParsedUser[] {
  const norm = text.replace(/\s+/g, " ").trim();
  const emailRe =
    /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  const emails: { email: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = emailRe.exec(norm))) {
    emails.push({ email: fixEmail(m[1]), index: m.index });
  }

  const users: ParsedUser[] = [];
  for (let i = 0; i < emails.length; i++) {
    const { email, index } = emails[i];
    const next = emails[i + 1]?.index ?? norm.length;
    const before = norm.slice(Math.max(0, index - 80), index).trim();
    const after = norm.slice(index + email.length, next);

    // Nombre: últimas palabras en mayúsculas / mixtas antes del correo
    const nameMatch = before.match(
      /(?:^|[\s])([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ.]+){0,5})\s*$/,
    );
    const fullName = (nameMatch?.[1] ?? "Residente").replace(/\s+/g, " ").trim();

    let status: PdfStatus = "Pendiente";
    if (/Aprobado/i.test(after)) status = "Aprobado";
    else if (/Rechazado/i.test(after)) status = "Rechazado";
    else if (/Pendiente/i.test(after)) status = "Pendiente";

    const pdfRole: PdfRole = /Comit[eé]\s*Vecinal/i.test(after)
      ? "Comité Vecinal"
      : "Colono";

    const houseM = after.match(/Casa\s*(\d+)/i);
    if (!houseM) continue;
    const houseNumber = String(Number(houseM[1]));

    const { accessCode, gateCode } = parseCodes(after);
    const { firstName, lastName } = titleCaseName(fullName);

    users.push({
      fullName: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email,
      status,
      pdfRole,
      houseNumber,
      accessCode,
      gateCode,
    });
  }

  // Deduplicar por email (el PDF a veces repite fragmentos)
  const byEmail = new Map<string, ParsedUser>();
  for (const u of users) {
    const prev = byEmail.get(u.email);
    if (!prev) {
      byEmail.set(u.email, u);
      continue;
    }
    // Preferir Aprobado > Pendiente > Rechazado; y el que tenga claves
    const rank = (s: PdfStatus) =>
      s === "Aprobado" ? 2 : s === "Pendiente" ? 1 : 0;
    if (
      rank(u.status) > rank(prev.status) ||
      (rank(u.status) === rank(prev.status) &&
        (u.accessCode ? 1 : 0) > (prev.accessCode ? 1 : 0))
    ) {
      byEmail.set(u.email, u);
    }
  }
  return [...byEmail.values()].sort(
    (a, b) => Number(a.houseNumber) - Number(b.houseNumber),
  );
}

async function clearUserOwnedData() {
  // Orden seguro ante FKs
  await prisma.notification.deleteMany();
  await prisma.newsReaction.deleteMany();
  await prisma.newsRead.deleteMany();
  await prisma.issuePhoto.deleteMany();
  await prisma.issueReport.deleteMany();
  await prisma.reservation.deleteMany();
  // Desligar autorías / emisor de multas
  await prisma.newsPost.updateMany({ data: { authorId: null } });
  await prisma.fine.updateMany({ data: { issuedById: null } });
  await prisma.user.deleteMany();
}

async function main() {
  const apply = process.argv.includes("--apply");
  const filePath = process.env.USUARIOS_PDF ?? DEFAULT_PDF;
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  const parsed = parseUsuariosPdfText(text);

  // Incluir aprobados y pendientes (acceso abierto). Excluir rechazados.
  const toImport = parsed.filter((u) => u.status !== "Rechazado");
  const skipped = parsed.filter((u) => u.status === "Rechazado");

  console.log(`Archivo: ${filePath}`);
  console.log(`Parseados: ${parsed.length}`);
  console.log(`A importar (Aprobado+Pendiente): ${toImport.length}`);
  console.log(`Omitidos (Rechazado): ${skipped.length}`);
  for (const s of skipped) {
    console.log(`  - Casa ${s.houseNumber} ${s.fullName} <${s.email}>`);
  }

  const byStatus = { Aprobado: 0, Pendiente: 0, Rechazado: 0 };
  const byRole = { Colono: 0, "Comité Vecinal": 0, AdminMaestro: 1 };
  for (const u of toImport) {
    byStatus[u.status]++;
    byRole[u.pdfRole]++;
  }
  console.log("Por estado (import):", byStatus);
  console.log("Por rol PDF:", byRole);

  console.log("\nMuestra:");
  for (const u of toImport.slice(0, 8)) {
    console.log(
      `  Casa ${u.houseNumber.padStart(2)} · ${u.status.padEnd(9)} · ${u.pdfRole.padEnd(15)} · ${u.email} · ${u.accessCode ?? "—"} / ${u.gateCode ?? "—"}`,
    );
  }

  if (!apply) {
    console.log("\nEnsayo. Para aplicar:");
    console.log("  npx tsx prisma/import-usuarios-pdf.ts --apply");
    return;
  }

  const masterHash = await bcrypt.hash(MASTER_PASSWORD, 10);
  const logins = await Promise.all(
    toImport.map(async (u) => {
      const password = generateTemporaryPassword(10);
      return {
        ...u,
        password,
        passwordHash: await bcrypt.hash(password, 10),
        role: u.pdfRole === "Comité Vecinal" ? Role.ADMIN : Role.COLONO,
      };
    }),
  );

  await clearUserOwnedData();

  await prisma.user.create({
    data: {
      email: MASTER_EMAIL,
      passwordHash: masterHash,
      firstName: "Admin",
      lastName: "Maestro",
      role: Role.ADMIN,
      houseNumber: null,
      accessCode: null,
      gateCode: null,
      mustChangePassword: false,
    },
  });

  for (const u of logins) {
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: u.passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        houseNumber: u.houseNumber,
        accessCode: u.accessCode,
        gateCode: u.gateCode,
        mustChangePassword: true,
      },
    });
  }

  await mkdir(path.join(process.cwd(), "data"), { recursive: true });
  const csvPath = path.join(process.cwd(), "data", "imported-logins.csv");
  const lines = [
    "houseNumber,role,status,name,email,password,accessCode,gateCode",
    `,"ADMIN","maestro","Admin Maestro",${MASTER_EMAIL},${MASTER_PASSWORD},,`,
    ...logins.map(
      (u) =>
        `${u.houseNumber},${u.role},${u.status},"${u.fullName.replaceAll('"', '""')}",${u.email},${u.password},"${u.accessCode ?? ""}","${u.gateCode ?? ""}"`,
    ),
  ];
  await writeFile(csvPath, lines.join("\n"), "utf8");

  const counts = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
  });
  console.log("\nImportación aplicada.");
  console.log("Usuarios por rol:", counts);
  console.log(`Admin maestro: ${MASTER_EMAIL} / (contraseña configurada)`);
  console.log(`Contraseñas temporales: ${csvPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
