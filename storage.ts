import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Pasta local onde ficam vídeos, avatares e arquivos renderizados.
// Em produção, troque por um armazenamento de objetos (Cloudflare R2, S3...).
export const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR ?? "storage");

export function storagePath(rel: string): string {
  const full = path.resolve(STORAGE_DIR, rel);
  if (!full.startsWith(STORAGE_DIR + path.sep)) throw new Error("Caminho inválido");
  return full;
}

export async function saveFile(folder: string, originalName: string, data: Buffer): Promise<string> {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 6);
  const rel = `${folder}/${randomUUID()}${ext}`;
  const full = storagePath(rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return rel;
}

export async function removeFile(rel: string | null | undefined) {
  if (!rel) return;
  await rm(storagePath(rel), { force: true });
}

export const VIDEO_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

export const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export function contentTypeFor(rel: string): string {
  const ext = path.extname(rel).toLowerCase();
  return VIDEO_TYPES[ext] ?? IMAGE_TYPES[ext] ?? "application/octet-stream";
}
