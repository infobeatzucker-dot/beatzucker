import { NextRequest } from "next/server";
import { existsSync, statSync } from "fs";
import { readdir, readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "./uploads";

const CONTENT_TYPES: Record<string, string> = {
  wav:  "audio/wav",
  mp3:  "audio/mpeg",
  flac: "audio/flac",
  aiff: "audio/aiff",
  aif:  "audio/aiff",
  ogg:  "audio/ogg",
  m4a:  "audio/mp4",
};

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("file_id");
  if (!fileId) return new Response("file_id required", { status: 400 });

  // Path traversal protection
  if (fileId.includes("..") || fileId.includes("/") || fileId.includes("\\")) {
    return new Response("Invalid file_id", { status: 400 });
  }

  const files = existsSync(UPLOAD_DIR) ? await readdir(UPLOAD_DIR) : [];
  const filename = files.find((f) => f.startsWith(fileId));
  if (!filename) return new Response("Not found", { status: 404 });

  const filePath = path.resolve(path.join(UPLOAD_DIR, filename));
  // Ensure resolved path stays within upload directory
  const resolvedUpload = path.resolve(UPLOAD_DIR);
  if (!filePath.startsWith(resolvedUpload)) {
    return new Response("Invalid path", { status: 400 });
  }
  if (!existsSync(filePath)) return new Response("Not found", { status: 404 });

  const ext = filename.split(".").pop()?.toLowerCase() ?? "wav";
  const contentType = CONTENT_TYPES[ext] ?? "audio/wav";
  const stat = statSync(filePath);
  const fileSize = stat.size;

  // Handle Range requests (required for audio seeking in browsers)
  const range = req.headers.get("range");
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const buffer = await readFile(filePath);
    const chunk = buffer.slice(start, end + 1);

    return new Response(chunk, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
      },
    });
  }

  const buffer = await readFile(filePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": fileSize.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}
