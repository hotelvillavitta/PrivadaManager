import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const DOC_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Emite un token de subida directa a Vercel Blob.
 * El archivo no pasa por el server action (evita fallos en iPhone/tablet).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let folder = "uploads";
        let kind: "image" | "document" = "document";
        try {
          const parsed = clientPayload
            ? (JSON.parse(clientPayload) as {
                folder?: string;
                kind?: "image" | "document";
              })
            : {};
          if (parsed.folder === "reports" || parsed.folder === "uploads") {
            folder = parsed.folder;
          }
          if (parsed.kind === "image" || parsed.kind === "document") {
            kind = parsed.kind;
          }
        } catch {
          // ignore payload parse errors
        }

        if (!pathname.startsWith(`grenache/${folder}/`)) {
          throw new Error("Ruta de archivo no permitida.");
        }

        return {
          // Tras convertir en el cliente, las fotos van como JPEG.
          allowedContentTypes:
            kind === "image"
              ? ["image/jpeg", "image/jpg", "image/png", "image/webp"]
              : DOC_TYPES,
          maximumSizeInBytes: 12 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            folder,
          }),
        };
      },
      onUploadCompleted: async () => {
        // Persistencia la hace la action del formulario con las URLs.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo autorizar la subida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
