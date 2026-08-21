import type { MetadataRoute } from "next";

const iconV =
  process.env.NEXT_PUBLIC_APP_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "1";

function icon(src: string, sizes: string, purpose?: "any" | "maskable") {
  return {
    src: `${src}?v=${iconV}`,
    sizes,
    type: "image/png" as const,
    ...(purpose ? { purpose } : {}),
  };
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grenache",
    short_name: "Grenache",
    description:
      "App residencial: noticias, reservaciones, cuotas y finanzas.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe8",
    theme_color: "#4f334a",
    orientation: "any",
    lang: "es",
    icons: [
      icon("/icons/icon-192.png", "192x192", "any"),
      icon("/icons/icon-512.png", "512x512", "any"),
      icon("/icons/icon-maskable-512.png", "512x512", "maskable"),
    ],
  };
}

