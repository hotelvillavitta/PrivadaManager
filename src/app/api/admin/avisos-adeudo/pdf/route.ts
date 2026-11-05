import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listDebtNoticeHouses } from "@/lib/fees/debt-notices";
import {
  buildDebtNoticesPdf,
  debtNoticePdfFilename,
} from "@/lib/notify/debt-notice-pdf";
import { getPrivada } from "@/lib/queries";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

  const casas = new URL(request.url).searchParams.get("casas") ?? "";
  const wanted = [
    ...new Set(
      casas
        .split(",")
        .map((house) => house.trim())
        .filter(Boolean),
    ),
  ].slice(0, 40);
  if (!wanted.length) {
    return NextResponse.json({ error: "Elige al menos una casa." }, { status: 400 });
  }

  const [houses, privada] = await Promise.all([
    listDebtNoticeHouses(),
    getPrivada(),
  ]);
  const byHouse = new Map(houses.map((house) => [house.houseNumber, house]));
  const selected = wanted
    .map((houseNumber) => byHouse.get(houseNumber))
    .filter((house) => house != null);
  if (!selected.length) {
    return NextResponse.json(
      { error: "Esas casas ya no tienen adeudo de mantenimiento." },
      { status: 404 },
    );
  }

  const issuedOnLabel = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Tijuana",
  }).format(new Date());
  const pdf = await buildDebtNoticesPdf({
    houses: selected,
    issuedOnLabel,
    privadaName: privada.name,
    privadaAddress: privada.address,
    privadaEmail: privada.email,
    privadaPhone: privada.phone,
  });
  const filename = debtNoticePdfFilename(selected.map((house) => house.houseNumber));

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
