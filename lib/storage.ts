/**
 * File storage helpers
 * Local filesystem now, S3/R2-ready via the same interface
 */

import { existsSync } from "fs";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { DOWNLOAD_WINDOW_MS } from "@/lib/constants";

const UPLOAD_DIR = path.resolve(process.env.TEMP_UPLOAD_DIR || "./uploads");
const MASTER_DIR = path.join(UPLOAD_DIR, "masters");
const ORIGINAL_WINDOW_MS = 60 * 60 * 1000;
const MASTER_CLEANUP_GRACE_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

const MASTER_FILES: Record<string, string> = {
  wav32: "wav", wav24: "wav", wav16: "wav", flac: "flac",
  mp3320: "mp3", mp3128: "mp3", aac256: "m4a",
};

export function getUploadPath(fileId: string, ext: string) {
  return path.join(UPLOAD_DIR, `${fileId}.${ext}`);
}

export function getMasterPath(masterId: string, format: string, ext: string) {
  return path.join(UPLOAD_DIR, "masters", `${masterId}_${format}.${ext}`);
}

export async function findFileById(fileId: string): Promise<string | null> {
  if (!existsSync(UPLOAD_DIR)) return null;
  const files = await readdir(UPLOAD_DIR);
  const match = files.find((f) => f.startsWith(fileId) && !f.includes("_"));
  return match ? path.join(UPLOAD_DIR, match) : null;
}

export async function cleanupFile(filePath: string) {
  try {
    if (existsSync(filePath)) await unlink(filePath);
  } catch {
    // ignore
  }
}

export async function removeMasterFiles(masterId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(masterId)) return;
  await Promise.all(Object.entries(MASTER_FILES).map(([format, ext]) =>
    cleanupFile(path.join(MASTER_DIR, `${masterId}_${format}.${ext}`))
  ));
}

export function findExistingMasterFormats(masterId: string): string[] {
  if (!/^[a-zA-Z0-9_-]+$/.test(masterId)) return [];
  return Object.entries(MASTER_FILES)
    .filter(([format, ext]) => existsSync(path.join(MASTER_DIR, `${masterId}_${format}.${ext}`)))
    .map(([format]) => format);
}

export async function removeUploadFiles(fileId: string) {
  if (!/^[0-9a-f-]+$/i.test(fileId) || !existsSync(UPLOAD_DIR)) return;
  const files = await readdir(UPLOAD_DIR, { withFileTypes: true });
  await Promise.all(files
    .filter((file) => file.isFile() && file.name.startsWith(`${fileId}.`))
    .map((file) => cleanupFile(path.join(UPLOAD_DIR, file.name))));
}

async function cleanupDirectory(directory: string, maxAgeMs: number) {
  if (!existsSync(directory)) return;
  const now = Date.now();
  const files = await readdir(directory, { withFileTypes: true });

  for (const file of files) {
    if (!file.isFile()) continue;
    const filePath = path.join(directory, file.name);
    try {
      const { mtimeMs } = await stat(filePath);
      if (now - mtimeMs > maxAgeMs) await unlink(filePath);
    } catch {
      // ignore
    }
  }
}

export async function cleanupOldFiles() {
  await Promise.all([
    cleanupDirectory(UPLOAD_DIR, ORIGINAL_WINDOW_MS),
    // File mtime is set during rendering, a few seconds before completedAt.
    // A grace period prevents physical deletion before the exact API deadline.
    cleanupDirectory(MASTER_DIR, DOWNLOAD_WINDOW_MS + MASTER_CLEANUP_GRACE_MS),
  ]);
}

const cleanupState = globalThis as typeof globalThis & { __beatzuckerStorageCleanup?: ReturnType<typeof setInterval> };

export function startStorageCleanup() {
  if (cleanupState.__beatzuckerStorageCleanup) return;
  void cleanupOldFiles();
  const timer = setInterval(() => void cleanupOldFiles(), CLEANUP_INTERVAL_MS);
  timer.unref?.();
  cleanupState.__beatzuckerStorageCleanup = timer;
}
