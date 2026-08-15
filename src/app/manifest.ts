import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grenaché",
    short_name: "Grenaché",
    description:
      "Portal de gestión residencial: noticias, reservaciones, cuotas y finanzas.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe8",
    theme_color: "#4f334a",
    orientation: "portrait-primary",
    lang: "es",
    icons: [
      {
        src: "/icons/icon-48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
