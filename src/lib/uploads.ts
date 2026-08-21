import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXT = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".doc",
  ".docx",
]);

export type UploadedDocument = {
  documentUrl: string | null;
  documentName: string | null;
};

type UploadLike = {
  name: string;
  size: number;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function isUploadLike(value: unknown): value is UploadLike {
  return (
    !!value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    typeof (value as UploadLike).arrayBuffer === "function" &&
    "name" in value &&
    "size" in value
  );
}

/** Extrae un archivo subido desde FormData (más fiable que `instanceof File`). */
export function fileFromFormData(
  value: FormDataEntryValue | null,
): UploadLike | null {
  if (!isUploadLike(value) || value.size === 0) return null;
  return value;
}

function extensionFor(file: UploadLike) {
  const fromName = path.extname(file.name).toLowerCase();
  if (fromName) return fromName;
  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/heic") return ".heic";
  if (file.type === "image/heif") return ".heif";
  return "";
}

function assertAllowed(file: UploadLike) {
  if (file.size > MAX_BYTES) {
    throw new Error("El archivo supera el límite de 8 MB.");
  }
  const ext = extensionFor(file);
  const mimeOk = !file.type || ALLOWED_MIME.has(file.type);
  const extOk = !ext || ALLOWED_EXT.has(ext);
  if (!mimeOk && !extOk) {
    throw new Error("Formato no permitido. Usa PDF, Word o imagen (JPG, PNG, WEBP).");
  }
  if (ext && !ALLOWED_EXT.has(ext) && file.type && !ALLOWED_MIME.has(file.type)) {
    throw new Error("Formato no permitido. Usa PDF, Word o imagen (JPG, PNG, WEBP).");
  }
}

/** True si se puede guardar archivos en este entorno. */
export function isDocumentUploadConfigured() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  // En Vercel, el store conectado autentica por OIDC (BLOB_STORE_ID).
  if (process.env.VERCEL === "1" && process.env.BLOB_STORE_ID) return true;
  // Fuera de Vercel: disco local.
  return process.env.VERCEL !== "1";
}

export async function saveUploadedDocument(
  file: File | UploadLike | null,
): Promise<UploadedDocument> {
  if (!file || !isUploadLike(file) || file.size === 0) {
    return { documentUrl: null, documentName: null };
  }

  assertAllowed(file);

  const safeExt = extensionFor(file) || ".bin";
  const filename = `${Date.now()}-${randomUUID()}${safeExt}`;
  const contentType = file.type || undefined;

  const onVercel = process.env.VERCEL === "1";
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasBlobStore = Boolean(process.env.BLOB_STORE_ID);

  if (hasBlobToken || (onVercel && hasBlobStore)) {
    const { put } = await import("@vercel/blob");
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const blob = await put(`grenache/uploads/${filename}`, buffer, {
        access: "public",
        contentType,
        ...(hasBlobToken
          ? { token: process.env.BLOB_READ_WRITE_TOKEN }
          : {}),
        multipart: file.size > 4 * 1024 * 1024,
        addRandomSuffix: false,
      });
      return {
        documentUrl: blob.url,
        documentName: file.name,
      };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Error desconocido de Blob.";
      throw new Error(
        `No se pudo subir el archivo a Vercel Blob. Revisa el store Blob y BLOB_READ_WRITE_TOKEN. (${detail})`,
      );
    }
  }

  // En Vercel el disco no es persistente: obligar Blob.
  if (onVercel) {
    throw new Error(
      "Falta configurar Vercel Blob. En Storage → Create Database → Blob, crea el store, marca “Add a read-write token env var”, y haz Redeploy.",
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return {
    documentUrl: `/uploads/${filename}`,
    documentName: file.name,
  };
}
