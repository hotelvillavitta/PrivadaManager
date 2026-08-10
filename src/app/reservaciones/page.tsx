import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getReservations } from "@/lib/queries";
import { ReservacionesClient } from "./reservaciones-client";

export default async function ReservacionesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const reservations = await getReservations();

  return (
    <ReservacionesClient
      isAdmin={session.user.role === "ADMIN"}
      currentUserId={session.user.id}
      reservations={reservations.map((r) => ({
        id: r.id,
        date: r.date,
        eventName: r.eventName,
        guests: r.guests,
        notes: r.notes,
        status: r.status,
        userId: r.userId,
        user: r.user,
      }))}
    />
  );
}
