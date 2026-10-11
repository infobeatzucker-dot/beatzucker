import { createHash, randomUUID } from "crypto";
import { createWriteStream, existsSync } from "fs";
import { mkdir, unlink } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { NextRequest, NextResponse } from "next/server";
import { normalizeAnalysis } from "@/lib/analysisValidation";
import { rateLimit } from "@/lib/rateLimit";
import { pythonServiceHeaders } from "@/lib/pythonService";
import { sanitizeOriginalFilename } from "@/lib/filename";
import { readBoundedMultipart, uploadRequestFailure } from "@/lib/boundedMultipart";
import { toolError } from "@/lib/toolClient";

export const maxDuration = 180;

const UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "./uploads";
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
const MAX_SIZE = 40 * 1024 * 1024;
const MAX_DURATION_SECONDS = 10 * 60;
const ACCEPTED_MIMES = new Set([
  "audio/wav", "audio/x-wav", "audio/wave", "audio/flac", "audio/x-flac",
  "audio/mpeg", "audio/mp3", "audio/aiff", "audio/x-aiff",
]);
const MIME_TO_EXT: Record<string, string> = {
  "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
  "audio/flac": "flac", "audio/x-flac": "flac",
  "audio/mpeg": "mp3", "audio/mp3": "mp3",
  "audio/aiff": "aiff", "audio/x-aiff": "aiff",
};

function validMagic(buf: Buffer) {
  if (buf.length < 12) return false;
  const first = buf.subarray(0, 4).toString("ascii");
  const type = buf.subarray(8, 12).toString("ascii");
  if ((first === "RIFF" && type === "WAVE") || (first === "FORM" && (type === "AIFF" || type === "AIFC"))) return true;
  if (first === "fLaC" || buf.subarray(0, 3).toString("ascii") === "ID3") return true;
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 && (buf[1] & 0x06) !== 0;
}

function clientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = req.headers.get("cf-connecting-ip") || forwarded || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 24);
}

export async function POST(req: NextRequest) {
  let lang: "de" | "en" = req.headers.get("accept-language")?.startsWith("de") ? "de" : "en";
  const failureResponse = (code:string,status:number) => NextResponse.json({code,error:toolError(Error(code),lang)}, {status, ...(status===429||status===503?{headers:{"Retry-After":status===429?"3600":"15"}}:{})});
  const key = clientKey(req);
  let filePath: string | null = null;
  let release: (() => void) | undefined;
  if (!rateLimit("public-analysis:global", 90, 60 * 60 * 1000))
    return failureResponse("LIMIT",429);
  try {
    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_SIZE + 1024 * 1024) {
      return failureResponse("SIZE",413);
    }
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
      return failureResponse("FORMAT",400);
    }

    const upload = await readBoundedMultipart(req, MAX_SIZE);
    release = upload.release;
    const form = upload.form;
    lang = form.get("lang") === "de" ? "de" : form.get("lang") === "en" ? "en" : lang;
    const requestedPurpose = form.get("purpose");
    const purpose = typeof requestedPurpose === "string" && ["mix-check", "key-bpm", "streaming-preview", "album-consistency", "reference-comparison", "silence-normalizer"].includes(requestedPurpose) ? requestedPurpose : "mix-check";
    const limit = purpose === "album-consistency" ? 16 : purpose === "reference-comparison" ? 10 : 3;
    if (!rateLimit(`public-analysis:${purpose}:${key}`, limit, 60 * 60 * 1000)) {
      return failureResponse("LIMIT",429);
    }
    const file = form.get("file");
    if (!(file instanceof File)) return failureResponse("FORMAT",400);
    if (file.size <= 0 || file.size > MAX_SIZE) return failureResponse("SIZE",413);
    const unknownMime = !file.type || file.type === "application/octet-stream";
    if (!ACCEPTED_MIMES.has(file.type) && !(unknownMime && /\.(wav|flac|mp3|aiff|aif)$/i.test(file.name))) return failureResponse("FORMAT",415);
    if (!validMagic(Buffer.from(await file.slice(0, 32).arrayBuffer()))) {
      return failureResponse("DECODE",415);
    }

    await mkdir(/*turbopackIgnore: true*/ UPLOAD_DIR, { recursive: true });
    const ext = MIME_TO_EXT[file.type] || file.name.split(".").pop()!.toLowerCase();
    filePath = path.resolve(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, `mixcheck-${randomUUID()}.${ext}`));
    const uploadRoot = path.resolve(/*turbopackIgnore: true*/ UPLOAD_DIR);
    if (path.relative(uploadRoot, filePath).startsWith("..")) {
      return failureResponse("FORMAT",400);
    }
    await pipeline(Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(/*turbopackIgnore: true*/ filePath, { flags: "wx" }));

    const infoResponse = await fetch(`${PYTHON_URL}/info`, {
      method: "POST", headers: pythonServiceHeaders(), body: JSON.stringify({ file_path: filePath }), signal: AbortSignal.timeout(15000),
    });
    if (!infoResponse.ok) return failureResponse(infoResponse.status>=500?"BUSY":infoResponse.status===413?"MEMORY":"DECODE", infoResponse.status>=500?503:infoResponse.status===413?413:415);
    const info = await infoResponse.json();
    if (!Number.isFinite(info.duration) || info.duration <= 0 || info.duration > MAX_DURATION_SECONDS) {
      return failureResponse("DURATION",413);
    }

    const requestAnalysis = () => fetch(`${PYTHON_URL}/analyze`, {
      method: "POST", headers: pythonServiceHeaders(), body: JSON.stringify({ file_path: filePath }), signal: AbortSignal.timeout(160000),
    });
    const analysisResponse = await requestAnalysis();
    if (!analysisResponse.ok) return failureResponse(analysisResponse.status===503?"BUSY":"ANALYSIS",[413,415,422,503].includes(analysisResponse.status)?analysisResponse.status:502);
    const analysis = normalizeAnalysis(await analysisResponse.json());
    if (!analysis) return failureResponse("ANALYSIS",502);

    return NextResponse.json(
      { analysis, filename: sanitizeOriginalFilename(file.name, `track.${ext}`) },
      { headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex" } },
    );
  } catch (error: unknown) {
    const failure = uploadRequestFailure(error);
    if (failure) return failure;
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.error("Public mix check error:", error);
    return failureResponse(timeout ? "TIMEOUT" : "BUSY", timeout ? 504 : 503);
  } finally {
    if (filePath && existsSync(/*turbopackIgnore: true*/ filePath)) await unlink(/*turbopackIgnore: true*/ filePath).catch(() => {});
    release?.();
  }
}
