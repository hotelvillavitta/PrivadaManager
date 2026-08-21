"use client";

import { upload } from "@vercel/blob/client";

const MAX_BYTES = 12 * 1024 * 1024;

export type ClientUploadResult = {
  url: string;
  name: string;
};

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-()\s]+/g, "_").slice(0, 80) || "archivo";
}

/** Comprime imágenes grandes a JPEG para móvil (iPhone ~10MB → ~1MB). */
async function maybeCompressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    return file;
  }
  // HEIC a veces no entra al canvas; si falla, se sube original.
  if (file.type.includes("heic") || file.type.includes("heif")) {
    return file;
  }
  if (file.size < 1.2 * 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1920;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Sube un archivo directo a Vercel Blob desde el navegador.
 * Evita el límite ~4.5MB de las Server Actions en iPhone/iPad.
 */
export async function uploadFileFromClient(
  file: File,
  opts: { folder: "reports" | "uploads"; kind: "image" | "document" },
): Promise<ClientUploadResult> {
  if (!file || file.size === 0) {
    throw new Error("Archivo vacío.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("El archivo supera el límite de 12 MB.");
  }

  const prepared =
    opts.kind === "image" ? await maybeCompressImage(file) : file;

  const pathname = `grenache/${opts.folder}/${Date.now()}-${sanitizeName(prepared.name)}`;

  const blob = await upload(pathname, prepared, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    clientPayload: JSON.stringify({
      folder: opts.folder,
      kind: opts.kind,
    }),
  });

  return { url: blob.url, name: prepared.name };
}

export async function uploadFilesFromClient(
  files: File[],
  opts: { folder: "reports" | "uploads"; kind: "image" | "document" },
): Promise<ClientUploadResult[]> {
  const out: ClientUploadResult[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    out.push(await uploadFileFromClient(file, opts));
  }
  return out;
}
