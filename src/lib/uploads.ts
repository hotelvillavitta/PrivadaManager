import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function extensionFor(file: File) {
  const fromName = path.extname(file.name).toLowerCase();
  if (fromName) return fromName;
  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  return "";
}

export async function saveUploadedDocument(file: File | null) {
  if (!file || file.size === 0) {
    return { documentUrl: null as string | null, documentName: null as string | null };
  }

  if (file.size > MAX_BYTES) {
    throw new Error("El archivo supera el límite de 8 MB.");
  }
  if (file.type && !ALLOWED.has(file.type)) {
    throw new Error("Formato no permitido. Usa PDF, Word o imagen.");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const safeExt = extensionFor(file) || ".bin";
  const filename = `${Date.now()}-${randomUUID()}${safeExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return {
    documentUrl: `/uploads/${filename}`,
    documentName: file.name,
  };
}
