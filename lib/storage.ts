/**
 * File storage helpers
 * Local filesystem now, S3/R2-ready via the same interface
 */

import { existsSync } from "fs";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { DOWNLOAD_WINDOW_MS } from "@/lib/constants";
import { db } from "@/lib/db";
import { activeDspMasterIds } from "@/lib/dspJobs";

const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.TEMP_UPLOAD_DIR || "./uploads");
const MASTER_DIR = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, "masters");
// The cleanup interval is part of the externally stated retention ceiling.
// At 55 minutes plus a five-minute sweep interval, abandoned originals are
// removed no later than about 60 minutes after their last write.
const ORIGINAL_WINDOW_MS = 55 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const MASTER_FILES: Record<string, string> = {
  wav32: "wav", wav24: "wav", wav16: "wav", flac: "flac",
  mp3320: "mp3", mp3128: "mp3", aac256: "m4a",
};

export function getUploadPath(fileId: string, ext: string) {
  return path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, `${fileId}.${ext}`);
}

export function getMasterPath(masterId: string, format: string, ext: string) {
  return path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, "masters", `${masterId}_${format}.${ext}`);
}

export async function findFileById(fileId: string): Promise<string | null> {
  if (!existsSync(/*turbopackIgnore: true*/ UPLOAD_DIR)) return null;
  const files = await readdir(/*turbopackIgnore: true*/ UPLOAD_DIR);
  const match = files.find((f) => f.startsWith(fileId) && !f.includes("_"));
  return match ? path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, match) : null;
}

export async function cleanupFile(filePath: string) {
  try {
    if (existsSync(/*turbopackIgnore: true*/ filePath)) await unlink(/*turbopackIgnore: true*/ filePath);
  } catch {
    // ignore
  }
}

export async function removeMasterFiles(masterId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(masterId)) return;
  await Promise.all(Object.entries(MASTER_FILES).map(([format, ext]) =>
    cleanupFile(path.join(/*turbopackIgnore: true*/ MASTER_DIR, `${masterId}_${format}.${ext}`))
  ));
}

export function findExistingMasterFormats(masterId: string): string[] {
  if (!/^[a-zA-Z0-9_-]+$/.test(masterId)) return [];
  return Object.entries(MASTER_FILES)
    .filter(([format, ext]) => existsSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ MASTER_DIR, `${masterId}_${format}.${ext}`)))
    .map(([format]) => format);
}

export async function removeUploadFiles(fileId: string) {
  if (!/^[0-9a-f-]+$/i.test(fileId) || !existsSync(/*turbopackIgnore: true*/ UPLOAD_DIR)) return;
  const files = await readdir(/*turbopackIgnore: true*/ UPLOAD_DIR, { withFileTypes: true });
  await Promise.all(files
    .filter((file) => file.isFile() && file.name.startsWith(`${fileId}.`))
    .map((file) => cleanupFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, file.name))));
}

async function cleanupDirectory(directory: string, maxAgeMs: number, preserve: (name: string) => boolean = () => false, deadline?: (name: string) => number | undefined) {
  if (!existsSync(/*turbopackIgnore: true*/ directory)) return;
  const now = Date.now();
  const files = await readdir(/*turbopackIgnore: true*/ directory, { withFileTypes: true });

  for (const file of files) {
    if (!file.isFile() || preserve(file.name)) continue;
    const filePath = path.join(/*turbopackIgnore: true*/ directory, file.name);
    try {
      const { mtimeMs } = await stat(/*turbopackIgnore: true*/ filePath);
      const expiresAt = deadline?.(file.name) ?? (mtimeMs + maxAgeMs);
      if (now > expiresAt) await unlink(/*turbopackIgnore: true*/ filePath);
    } catch {
      // ignore
    }
  }
}

export async function cleanupOldFiles() {
  const active = await activeDspMasterIds();
  const masters = await db.master.findMany({ select: { id: true, fileId: true, status: true, completedAt: true, createdAt: true } });
  const protectedIds = new Set([...active, ...masters.filter(master => master.status === "processing").map(master => master.id)]);
  const protectedFiles = new Set(masters.filter(master => protectedIds.has(master.id)).map(master => master.fileId));
  const byId = new Map(masters.map(master => [master.id, master]));
  const masterId = (name: string) => name.slice(0, name.lastIndexOf("_"));
  await Promise.all([
    cleanupDirectory(UPLOAD_DIR, ORIGINAL_WINDOW_MS, name => protectedFiles.has(name.split(".")[0])),
    cleanupDirectory(MASTER_DIR, DOWNLOAD_WINDOW_MS,
      name => protectedIds.has(masterId(name)),
      name => {
        const master = byId.get(masterId(name));
        if (!master || master.status !== "done") return undefined;
        return (master.completedAt ?? master.createdAt).getTime() + DOWNLOAD_WINDOW_MS;
      }),
  ]);
}

const cleanupState = globalThis as typeof globalThis & { __beatzuckerStorageCleanup?: ReturnType<typeof setInterval> };

export function startStorageCleanup() {
  if (cleanupState.__beatzuckerStorageCleanup) return;
  let running = false;
  async function sweep() {
    if (running) return;
    running = true;
    try { await cleanupOldFiles(); }
    catch (error) { console.error("[storage] Cleanup skipped:", error); }
    finally { running = false; }
  }
  void sweep();
  const timer = setInterval(() => void sweep(), CLEANUP_INTERVAL_MS);
  timer.unref?.();
  cleanupState.__beatzuckerStorageCleanup = timer;
}
