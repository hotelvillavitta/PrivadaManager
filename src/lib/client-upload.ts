"use client";

import { upload } from "@vercel/blob/client";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_SIDE = 1920;
const JPEG_QUALITY = 0.82;

export type ClientUploadResult = {
  url: string;
  name: string;
};

function sanitizeBaseName(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "foto";
  return base.replace(/\s+/g, "_").replace(/[^\w.\-()]+/g, "_").slice(0, 60) || "foto";
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
  if ((file.type || "").startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name);
}

function canvasToJpegFile(
  source: CanvasImageSource,
  width: number,
  height: number,
  outName: string,
): Promise<File> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("No se pudo procesar la imagen."));
  }
  ctx.drawImage(source, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size < 32) {
          reject(new Error("No se pudo convertir la foto a JPEG."));
          return;
        }
        resolve(new File([blob], outName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/** Safari en iPhone sí decodifica HEIC vía object URL + <img>. */
async function reencodeViaImageElement(file: File, outName: string): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    // No usar crossOrigin con blob: — rompe la carga local.
    img.src = objectUrl;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) {
      throw new Error("Imagen sin dimensiones.");
    }
    return await canvasToJpegFile(img, img.naturalWidth, img.naturalHeight, outName);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function reencodeViaBitmap(file: File, outName: string): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    return await canvasToJpegFile(bitmap, bitmap.width, bitmap.height, outName);
  } finally {
    bitmap.close();
  }
}

async function reencodeViaHeic2Any(file: File, outName: string): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: JPEG_QUALITY,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  if (!blob || blob.size < 32) {
    throw new Error("Conversión HEIC vacía.");
  }
  const mid = new File([blob], outName, { type: "image/jpeg" });
  try {
    return await reencodeViaBitmap(mid, outName);
  } catch {
    return mid;
  }
}

/**
 * Toda foto se re-codifica a JPEG real en el dispositivo.
 * Evita HEIC de la fototeca (nombre .jpg pero bytes HEIC → icono “?”).
 */
export async function prepareImageForClient(file: File): Promise<File> {
  const outName = `${sanitizeBaseName(file.name)}.jpg`;

  try {
    return await reencodeViaImageElement(file, outName);
  } catch {
    // siguiente método
  }

  try {
    return await reencodeViaBitmap(file, outName);
  } catch {
    // siguiente método
  }

  if (isHeicLike(file) || !file.type || file.type === "application/octet-stream") {
    try {
      return await reencodeViaHeic2Any(file, outName);
    } catch {
      // cae al error final
    }
  }

  throw new Error(
    "No se pudo preparar esta foto para mostrarla. En el iPhone: Ajustes → Cámara → Formatos → «Más compatible», o elige otra imagen.",
  );
}

async function forceJpegImage(file: File): Promise<File> {
  return prepareImageForClient(file);
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

  const shouldForceJpeg =
    opts.kind === "image" ||
    isHeicLike(file) ||
    (opts.kind === "document" && isImageLike(file));

  const prepared = shouldForceJpeg ? await forceJpegImage(file) : file;
  const safeName = shouldForceJpeg
    ? `${sanitizeBaseName(file.name)}.jpg`
    : `${sanitizeBaseName(file.name)}${/\.[a-z0-9]+$/i.exec(file.name)?.[0] ?? ""}`;
  const pathname = `grenache/${opts.folder}/${Date.now()}-${safeName}`;

  const blob = await upload(pathname, prepared, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    contentType: shouldForceJpeg ? "image/jpeg" : prepared.type || undefined,
    clientPayload: JSON.stringify({
      folder: opts.folder,
      kind: shouldForceJpeg ? "image" : opts.kind,
    }),
  });

  return { url: blob.url, name: safeName };
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
