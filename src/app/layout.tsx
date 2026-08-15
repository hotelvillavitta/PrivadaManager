import type { Metadata, Viewport } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { auth } from "@/lib/auth";
import { getPrivada, getRecentNotifications, getUnreadCount } from "@/lib/queries";
import "./globals.css";

/** Portal autenticado: nunca cachear HTML en CDN/navegador. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const display = Libre_Baskerville({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#4f334a",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: {
    default: "Grenaché | Portal residencial",
    template: "%s | Grenaché",
  },
  description:
    "Portal de gestión residencial: noticias, reservaciones, cuotas y finanzas. Tu privada, siempre en orden.",
  applicationName: "Grenaché",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Grenaché",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Grenaché | Portal residencial",
    description:
      "Portal de gestión residencial. Tu privada, siempre en orden.",
    images: [{ url: "/brand/og-icon.png", width: 512, height: 512 }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const privada = await getPrivada();
  const userId = session?.user?.id;
  const [unread, recent] = userId
    ? await Promise.all([
        getUnreadCount(userId),
        getRecentNotifications(userId, 5),
      ])
    : [0, [] as Awaited<ReturnType<typeof getRecentNotifications>>];

  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <Navbar
            user={session?.user ?? null}
            unread={unread}
            privadaName={privada.name}
            notifications={recent.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              read: n.read,
              newsId: n.newsId,
              reservationId: n.reservationId,
              fineId: n.fineId,
              createdAt: n.createdAt.toISOString(),
            }))}
          />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          {session?.user && <Footer privada={privada} />}
        </Providers>
      </body>
    </html>
  );
}
