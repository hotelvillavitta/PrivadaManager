import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecentNotifications, getUnreadCount } from "@/lib/queries";

/** Payload ligero para el campanario: no bloquea el layout RSC. */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ unread: 0, items: [] });
  }

  const [unread, recent] = await Promise.all([
    getUnreadCount(userId),
    getRecentNotifications(userId, 5),
  ]);

  return NextResponse.json({
    unread,
    items: recent.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      read: n.read,
      newsId: n.newsId,
      reservationId: n.reservationId,
      fineId: n.fineId,
      issueReportId: n.issueReportId,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
