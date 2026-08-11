import type { Metadata, Viewport } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { auth } from "@/lib/auth";
import { getPrivada, getUnreadCount } from "@/lib/queries";
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
  themeColor: "#0a1628",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: {
    default: "Privada Manager | Grenaché",
    template: "%s | Privada Manager",
  },
  description:
    "Portal de gestión residencial: noticias, reservaciones, cuotas y finanzas. Tu privada, siempre en orden.",
  applicationName: "Privada Manager",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Privada Manager",
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
    title: "Privada Manager | Grenaché",
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
  const unread = session?.user?.id
    ? await getUnreadCount(session.user.id)
    : 0;

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
          />
          <main className="flex-1">{children}</main>
          {session?.user && <Footer privada={privada} />}
        </Providers>
      </body>
    </html>
  );
}
