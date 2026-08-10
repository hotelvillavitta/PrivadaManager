import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Grenaché | Portal Residencial",
  description:
    "Portal de gestión residencial: noticias, reservaciones, cuotas y finanzas de Grenaché.",
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
