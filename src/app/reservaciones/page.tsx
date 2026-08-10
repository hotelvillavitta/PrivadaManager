import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getReservations, houseHasPendingFees } from "@/lib/queries";
import { ReservacionesClient } from "./reservaciones-client";

export default async function ReservacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ solicitud?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const [reservations, hasPendingFees] = await Promise.all([
    getReservations(),
    houseHasPendingFees(session.user.houseNumber),
  ]);

  return (
    <ReservacionesClient
      isAdmin={session.user.role === "ADMIN"}
      currentUserId={session.user.id}
      houseNumber={session.user.houseNumber}
      hasPendingFees={
        session.user.role === "ADMIN" ? false : hasPendingFees
      }
      focusReservationId={params.solicitud ?? null}
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
