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

function isHeicLike(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function isImageLike(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name);
}

/** iPhone fototeca → HEIC; casi ningún navegador lo muestra en <img>. */
async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicLike(file)) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    throw new Error(
      "Esta foto está en formato HEIC. En el iPhone: Ajustes → Cámara → Formatos → Más compatible, o elige “Imagen JPEG” al compartir.",
    );
  }
}

/** Comprime imágenes grandes a JPEG (iPhone ~10MB → ~1MB). */
async function maybeCompressImage(file: File): Promise<File> {
  if (!isImageLike(file)) return file;
  if (file.size < 1.2 * 1024 * 1024 && !isHeicLike(file)) return file;

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
    if (!blob) return file;
    // Tras HEIC→JPEG conviene siempre devolver .jpg aunque el tamaño no baje.
    if (blob.size >= file.size && file.type === "image/jpeg") return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function prepareImageForUpload(file: File): Promise<File> {
  const asJpeg = await convertHeicToJpeg(file);
  return maybeCompressImage(asJpeg);
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

  let prepared = file;
  if (opts.kind === "image" || isHeicLike(file) || isImageLike(file)) {
    // Documentos que son foto de la fototeca también se normalizan a JPEG.
    if (opts.kind === "image" || isHeicLike(file)) {
      prepared = await prepareImageForUpload(file);
    } else if (opts.kind === "document" && isImageLike(file)) {
      prepared = await prepareImageForUpload(file);
    }
  }

  const pathname = `grenache/${opts.folder}/${Date.now()}-${sanitizeName(prepared.name)}`;

  const blob = await upload(pathname, prepared, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    contentType: prepared.type || undefined,
    clientPayload: JSON.stringify({
      folder: opts.folder,
      kind: opts.kind === "image" || isImageLike(prepared) ? "image" : "document",
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
