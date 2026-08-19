import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaClient, FeeStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

const DEFAULT_XLSX =
  "/Users/jcmac15/Desktop/Gestion de Privadas/grenache.xlsx";
const PAID_AMOUNT = 200;
const EMPTY_DEBT_AMOUNT = 250;
const MONTH_CODES: Record<string, number> = {
  ENE: 1,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DIC: 12,
};

type FeeRow = {
  houseNumber: string;
  year: number;
  month: number;
  amount: number;
  status: FeeStatus;
  paidAt: Date | null;
  withSurcharge: boolean;
};

function parsePeriod(header: string): { year: number; month: number } {
  const code = header.slice(0, 3).toUpperCase();
  const yy = Number(header.slice(3));
  const month = MONTH_CODES[code];
  if (!month || Number.isNaN(yy)) {
    throw new Error(`Columna de periodo no reconocida: ${header}`);
  }
  return { month, year: 2000 + yy };
}

function normalizeHouse(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) throw new Error("Fila sin número de casa");
  // El Excel usó "MA" por error; es la casa 1.
  if (value.toUpperCase() === "MA") return "1";
  if (/^\d+$/.test(value)) return String(Number(value));
  return value.toUpperCase();
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(titleCase);
  if (parts.length === 0) return { firstName: "Residente", lastName: "Grenache" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "—" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function titleCase(word: string): string {
  return word
    .toLowerCase()
    .replace(/(^|[-'])\p{L}/gu, (ch) => ch.toUpperCase());
}

function placeholderEmail(houseNumber: string): string {
  return `casa${houseNumber.toLowerCase()}@grenache.mx`;
}

function cellToFee(
  houseNumber: string,
  year: number,
  month: number,
  cell: unknown,
): FeeRow {
  if (typeof cell === "string" && cell.trim().toLowerCase() === "pagado") {
    return {
      houseNumber,
      year,
      month,
      amount: PAID_AMOUNT,
      status: FeeStatus.PAGADO,
      paidAt: new Date(year, month - 1, 10, 12, 0, 0),
      withSurcharge: false,
    };
  }

  if (cell === null || cell === undefined || String(cell).trim() === "") {
    return {
      houseNumber,
      year,
      month,
      amount: EMPTY_DEBT_AMOUNT,
      status: FeeStatus.ADEUDO,
      paidAt: null,
      withSurcharge: false,
    };
  }

  const amount = typeof cell === "number" ? cell : Number(String(cell).replace(",", ""));
  if (!Number.isFinite(amount)) {
    throw new Error(`Valor no reconocido en casa ${houseNumber} ${month}/${year}: ${cell}`);
  }

  // En el Excel, un monto (casi siempre 250) significa cobrado con recargo.
  return {
    houseNumber,
    year,
    month,
    amount,
    status: FeeStatus.PAGADO,
    paidAt: new Date(year, month - 1, 10, 12, 0, 0),
    withSurcharge: true,
  };
}

function loadWorkbook(filePath: string) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  if (rows.length < 2) throw new Error("El Excel no tiene filas de datos");

  const header = rows[0].map((h) => String(h ?? "").trim());
  const periods = header.slice(2).map(parsePeriod);

  const residents: {
    houseNumber: string;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
  }[] = [];
  const fees: FeeRow[] = [];

  for (const row of rows.slice(1)) {
    if (!row || row.every((c) => c === null || String(c).trim() === "")) continue;
    const houseNumber = normalizeHouse(row[0]);
    const fullName = String(row[1] ?? "").trim();
    const { firstName, lastName } = splitName(fullName);
    residents.push({
      houseNumber,
      fullName,
      firstName,
      lastName,
      email: placeholderEmail(houseNumber),
    });
    periods.forEach((period, i) => {
      fees.push(cellToFee(houseNumber, period.year, period.month, row[i + 2]));
    });
  }

  return { sheetName: wb.SheetNames[0], periods, residents, fees };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const filePath = process.env.GRENACHE_XLSX ?? DEFAULT_XLSX;
  const { sheetName, periods, residents, fees } = loadWorkbook(filePath);

  const paidOnTime = fees.filter(
    (f) => f.status === FeeStatus.PAGADO && !f.withSurcharge,
  ).length;
  const paidSurcharge = fees.filter(
    (f) => f.status === FeeStatus.PAGADO && f.withSurcharge,
  ).length;
  const debt = fees.filter((f) => f.status !== FeeStatus.PAGADO).length;
  const debtAmount = fees
    .filter((f) => f.status !== FeeStatus.PAGADO)
    .reduce((sum, f) => sum + f.amount, 0);

  console.log(`Archivo: ${filePath}`);
  console.log(`Hoja: ${sheetName}`);
  console.log(`Periodos: ${periods[0].month}/${periods[0].year} → ${periods.at(-1)!.month}/${periods.at(-1)!.year} (${periods.length})`);
  console.log(`Casas/residentes: ${residents.length}`);
  console.log(
    `Cuotas: ${fees.length} (pagadas ${paidOnTime}, con recargo ${paidSurcharge}, adeudo ${debt}, monto adeudo $${debtAmount.toFixed(2)})`,
  );
  console.log(`Pagado=$${PAID_AMOUNT}  |  monto numérico=PAGADO con recargo  |  vacío=$${EMPTY_DEBT_AMOUNT} ADEUDO`);

  if (!apply) {
    console.log("\nEnsayo solamente. Para escribir en la base:");
    console.log("  npm run db:import:apply");
    console.log("  npm run db:import:fees   (solo cuotas, no toca usuarios ni contraseñas)");
    return;
  }

  const feesOnly = process.argv.includes("--fees-only");

  if (feesOnly) {
    await prisma.monthlyFee.deleteMany();
    const chunk = 800;
    for (let i = 0; i < fees.length; i += chunk) {
      await prisma.monthlyFee.createMany({ data: fees.slice(i, i + chunk) });
      console.log(`  insertadas ${Math.min(i + chunk, fees.length)} / ${fees.length}`);
    }
    console.log("\nCuotas actualizadas. Residentes y contraseñas sin cambios.");
    return;
  }

  const logins = await Promise.all(
    residents.map(async (r) => {
      const password = randomBytes(6).toString("base64url");
      return { ...r, password, passwordHash: await bcrypt.hash(password, 10) };
    }),
  );

  await prisma.$transaction(
    async (tx) => {
      await tx.monthlyFee.deleteMany();
      await tx.user.deleteMany({ where: { role: Role.COLONO } });

      for (const r of logins) {
        await tx.user.create({
          data: {
            email: r.email,
            passwordHash: r.passwordHash,
            firstName: r.firstName,
            lastName: r.lastName,
            role: Role.COLONO,
            houseNumber: r.houseNumber,
          },
        });
      }

      const chunk = 800;
      for (let i = 0; i < fees.length; i += chunk) {
        await tx.monthlyFee.createMany({ data: fees.slice(i, i + chunk) });
      }
    },
    { timeout: 180_000, maxWait: 20_000 },
  );

  await mkdir(path.join(process.cwd(), "data"), { recursive: true });
  const csvPath = path.join(process.cwd(), "data", "imported-logins.csv");
  const lines = [
    "houseNumber,name,email,password",
    ...logins.map(
      (r) =>
        `${r.houseNumber},"${r.fullName.replaceAll('"', '""')}",${r.email},${r.password}`,
    ),
  ];
  await writeFile(csvPath, lines.join("\n"), "utf8");

  const remainingAdmins = await prisma.user.count({ where: { role: Role.ADMIN } });
  console.log(`\nImportación lista. Admins conservados: ${remainingAdmins}`);
  console.log(`Contraseñas temporales (una por casa): ${csvPath}`);
  console.log("No se sube a git. Después el admin podrá generar la inicial y el residente la cambiará por correo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
