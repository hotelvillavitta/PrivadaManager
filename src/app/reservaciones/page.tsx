import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getHouseAccount,
  getPrivada,
  getReservations,
  houseHasPendingFees,
} from "@/lib/queries";
import { ReservacionesClient } from "./reservaciones-client";

export default async function ReservacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ solicitud?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const houseNumber = session.user.houseNumber;
  const [reservations, hasPendingFees, privada, account] = await Promise.all([
    getReservations(),
    houseHasPendingFees(houseNumber),
    getPrivada(),
    houseNumber
      ? getHouseAccount(houseNumber)
      : Promise.resolve({ hasConvenio: false }),
  ]);

  return (
    <ReservacionesClient
      isAdmin={false}
      currentUserId={session.user.id}
      houseNumber={houseNumber}
      hasPendingFees={hasPendingFees}
      hasConvenio={account.hasConvenio}
      focusReservationId={params.solicitud ?? null}
      capacityMax={privada.capacityMax}
      capacityNote={privada.capacityNote}
      schedules={privada.schedules}
      rules={privada.rules}
      reservations={reservations.map((r) => ({
        id: r.id,
        date: r.date,
        eventName: r.eventName,
        guests: r.guests,
        notes: r.notes,
        rejectionReason: r.rejectionReason,
        status: r.status,
        userId: r.userId,
        user: r.user,
      }))}
    />
  );
}
