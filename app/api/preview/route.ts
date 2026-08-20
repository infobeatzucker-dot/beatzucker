import { NextRequest } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { readdir } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { verifyUpload } from "@/lib/uploadAuthorization";

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
  if (!fileId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileId)) {
    return new Response("Invalid file_id", { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const uploadToken = req.nextUrl.searchParams.get("upload_token");
  if (!verifyUpload(fileId, session.user.id, uploadToken)) {
    return new Response("Forbidden", { status: 403 });
  }

  // Path traversal protection
  if (fileId.includes("..") || fileId.includes("/") || fileId.includes("\\")) {
    return new Response("Invalid file_id", { status: 400 });
  }

  const files = existsSync(UPLOAD_DIR) ? await readdir(UPLOAD_DIR) : [];
  const filename = files.find((f) => f.startsWith(`${fileId}.`));
  if (!filename) return new Response("Not found", { status: 404 });

  const filePath = path.resolve(path.join(UPLOAD_DIR, filename));
  // Ensure resolved path stays within upload directory
  const resolvedUpload = path.resolve(UPLOAD_DIR);
  const relative = path.relative(resolvedUpload, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
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
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= fileSize) {
      return new Response("Invalid range", { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
    }
    const chunkSize = end - start + 1;

    const chunk = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;

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

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": fileSize.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}
