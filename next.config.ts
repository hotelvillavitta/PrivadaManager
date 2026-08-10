import type { NextConfig } from "next";

const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.npm_package_version ||
  String(Date.now());

const nextConfig: NextConfig = {
  // `standalone` es para Docker/VPS. En Vercel se usa el build por defecto.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  env: {
    // Disponible en el cliente para detectar deploys nuevos sin reinstalar.
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    const noStore = [
      {
        key: "Cache-Control",
        value: "private, no-cache, no-store, must-revalidate, max-age=0",
      },
      { key: "CDN-Cache-Control", value: "no-store" },
      { key: "Vercel-CDN-Cache-Control", value: "no-store" },
      { key: "Pragma", value: "no-cache" },
    ];

    return [
      // Páginas/APIs/HTML: siempre frescas (evita “tengo que reinstalar”).
      {
        source: "/((?!_next/static).*)",
        headers: noStore,
      },
      // Assets con hash de Next: sí se pueden cachear agresivamente.
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
