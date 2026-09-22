import type { Metadata, Viewport } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { auth } from "@/lib/auth";
import { getPrivada, privadaThemeStyle } from "@/lib/queries";
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
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f334a",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: {
    default: "Grenache | App Residencial",
    template: "%s | Grenache",
  },
  description:
    "App residencial: noticias, reservaciones, cuotas y finanzas. Tu privada, siempre en orden.",
  applicationName: "Grenache",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Grenache",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Grenache | App Residencial",
    description: "App residencial. Tu privada, siempre en orden.",
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
  const [session, privada] = await Promise.all([auth(), getPrivada()]);
  const themeStyle = privadaThemeStyle(privada);

  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} antialiased`}
    >
      <body
        className="flex min-h-dvh flex-col bg-transparent font-sans"
        style={themeStyle}
      >
        <Providers>
          <Navbar
            user={session?.user ?? null}
            privadaName={privada.name}
            logoUrl={privada.logoUrl}
          />
          <main className="flex-1 pb-28 landscape:max-md:pb-20 md:pb-0">
            {children}
          </main>
          {session?.user && <Footer privada={privada} />}
        </Providers>
      </body>
    </html>
  );
}
