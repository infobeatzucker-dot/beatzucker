import { NextRequest } from "next/server";
import path from "path";
import { existsSync } from "fs";
import { readdir, stat } from "fs/promises";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { sendMasteringErrorEmail } from "@/lib/email";
import { sendMasteringCompleteEmail } from "@/lib/email";
import { DAILY_MASTER_LIMIT } from "@/lib/constants";
import { normalizeAnalysis, normalizeReferenceAnalysis, verifyAnalysis } from "@/lib/analysisValidation";
import { verifyUpload } from "@/lib/uploadAuthorization";
import { findExistingMasterFormats, removeMasterFiles } from "@/lib/storage";
import { sanitizeOriginalFilename } from "@/lib/filename";
import { normalizeParamOverrides } from "@/lib/masteringParams";
import { pythonServiceHeaders } from "@/lib/pythonService";

// Allow up to 10 minutes – mastering a full track can take 3–5 min
export const maxDuration = 600;

const UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "./uploads";
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";
const PLATFORMS = new Set(["spotify", "apple", "youtube", "club", "tidal", "amazon", "deezer", "tiktok", "soundcloud", "broadcast", "custom"]);
const PRESETS = new Set(["auto", "electronic", "hiphop", "rock", "pop", "jazz", "classical", "podcast", "metal", "rnb", "ambient", "lofi", "country", "trap", "latin", "dance", "techno", "edm"]);
const FORMATS = new Set(["wav32", "wav24", "wav16", "flac", "mp3320", "mp3128", "aac256"]);
const FORMAT_EXTENSIONS: Record<string, string> = {
  wav32: "wav", wav24: "wav", wav16: "wav", flac: "flac",
  mp3320: "mp3", mp3128: "mp3", aac256: "m4a",
};

// SSE helper
function encodeSSE(data: object) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 64 * 1024) {
    return Response.json({ error: "Mastering-Anfrage ist zu groß" }, { status: 413 });
  }
  const parsedBody: unknown = await req.json().catch(() => null);
  const body = parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)
    ? parsedBody as Record<string, unknown>
    : {};
  const fileId    = body.file_id    as string | undefined;
  const platformRaw = (body.platform as string) || "spotify";
  const presetRaw = (body.preset as string) || "auto";
  const formatRaw = (body.format as string) || "mp3128";
  const intensityRaw = Number(body.intensity ?? 65);
  const intensity = Number.isFinite(intensityRaw) ? Math.min(100, Math.max(0, intensityRaw)) : 65;
  const targetLufsRaw = Number(body.target_lufs);
  const targetLufs = platformRaw === "custom" && Number.isFinite(targetLufsRaw)
    ? Math.min(-6, Math.max(-23, targetLufsRaw)) : undefined;
  const platform = PLATFORMS.has(platformRaw) ? platformRaw : "";
  const format = FORMATS.has(formatRaw) ? formatRaw : "";
  const originalName = sanitizeOriginalFilename(body.original_name);
  const normalizedAnalysis = normalizeAnalysis(body.analysis);
  const analysisToken = body.analysis && typeof body.analysis === "object" && !Array.isArray(body.analysis)
    ? (body.analysis as Record<string, unknown>).analysis_token
    : undefined;
  const analysis = normalizedAnalysis && verifyAnalysis(fileId || "", normalizedAnalysis, analysisToken)
    ? normalizedAnalysis : undefined;
  const referenceAnalysis = body.reference_analysis === undefined
    ? undefined : normalizeReferenceAnalysis(body.reference_analysis);
  // Manuell nachjustierte Parameter. Werden hier nur durchgereicht — gefiltert
  // und geklemmt wird serverseitig in python/ai_params.apply_overrides(), damit
  // die Whitelist genau dort liegt, wo die Werte ins DSP gehen.
  const overrides = body.overrides === undefined ? undefined : normalizeParamOverrides(body.overrides);

  if (!fileId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileId)) {
    return Response.json({ error: "Ungültige Datei-ID" }, { status: 400 });
  }
  if (!platform || !PRESETS.has(presetRaw) || !format) {
    return Response.json({ error: "Ungültige Mastering-Einstellung" }, { status: 400 });
  }
  if (platform === "custom" && targetLufs === undefined) {
    return Response.json({ error: "Benutzerdefiniertes LUFS-Ziel fehlt" }, { status: 400 });
  }
  if (body.reference_analysis !== undefined && !referenceAnalysis) {
    return Response.json({ error: "Ungültige Referenzanalyse" }, { status: 400 });
  }
  if (body.overrides !== undefined && !overrides) {
    return Response.json({ error: "Ungültige manuelle Mastering-Parameter" }, { status: 400 });
  }

  // ── Auth + quota check ────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  const userId  = session?.user?.id ?? null;

  // Rate limit: 5 master requests per minute per user
  const rlKey = userId ? `master:${userId}` : `master:ip:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
  if (!rateLimit(rlKey, 5, 60 * 1000)) {
    return new Response(
      JSON.stringify({ error: "Zu viele Anfragen. Bitte warte einen Moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!userId) {
    // Upload API already requires auth — this path should not be reached
    return new Response(JSON.stringify({ error: "Anmeldung erforderlich" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!verifyUpload(fileId, userId, body.upload_token)) {
    return Response.json({ error: "Kein Zugriff auf diesen Upload" }, { status: 403 });
  }

  const preset = presetRaw;

  // Reserve the run together with the quota check. Keeping both operations in
  // one serializable transaction prevents parallel requests from all observing
  // the same old count and exceeding the daily limit.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const reservedMaster = await db.$transaction(async (tx) => {
    const activeCount = await tx.master.count({ where: { userId, status: "processing" } });
    if (activeCount > 0) return { reason: "active" as const };
    const todayCount = await tx.master.count({
      where: {
        userId,
        status: { in: ["done", "processing"] },
        createdAt: { gte: startOfDay },
      },
    });
    if (todayCount >= DAILY_MASTER_LIMIT) return { reason: "daily" as const };
    const master = await tx.master.create({
      data: {
        userId,
        fileId,
        originalName,
        platform,
        preset,
        status: "processing",
        preAnalysis: analysis ? JSON.stringify(analysis) : null,
      },
    });
    return { master };
  });
  if ("reason" in reservedMaster) {
    if (reservedMaster.reason === "active") {
      return Response.json({
        error: "Für dieses Konto läuft bereits ein Mastering. Bitte warte, bis es abgeschlossen ist.",
      }, { status: 409 });
    }
    return new Response(
      JSON.stringify({
        error: `Tageslimit erreicht (${DAILY_MASTER_LIMIT} Masters/Tag). Bitte versuche es morgen wieder.`,
        used: DAILY_MASTER_LIMIT,
        limit: DAILY_MASTER_LIMIT,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Set up SSE response ──────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let clientConnected = true;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (!clientConnected) return;
        try {
          controller.enqueue(encoder.encode(encodeSSE(data)));
        } catch {
          clientConnected = false;
        }
      };
      const close = () => {
        if (!clientConnected) return;
        try { controller.close(); } catch { /* client disconnected */ }
        clientConnected = false;
      };

      const masterId = reservedMaster.master.id;
      const dbMasterId = reservedMaster.master.id;

      try {
        // Find uploaded file
        const files = existsSync(UPLOAD_DIR) ? await readdir(UPLOAD_DIR) : [];
        const filename = files.find((f) => f.startsWith(`${fileId}.`));

        if (!filename) {
          throw new Error("Upload wurde nicht gefunden oder ist bereits abgelaufen");
        }

        const filePath = path.resolve(path.join(UPLOAD_DIR, filename));
        send({ step: "analyzing", label: "Analyzing track…", progress: 5 });

        // Call Python mastering service
        const res = await fetch(`${PYTHON_URL}/master`, {
          method: "POST",
          headers: pythonServiceHeaders(),
          body: JSON.stringify({
            file_path: filePath,
            platform,
            ...(targetLufs !== undefined ? { target_lufs: targetLufs } : {}),
            preset,
            intensity,
            format,
            master_id: masterId,
            output_dir: path.resolve(path.join(UPLOAD_DIR, "masters")),
            ...(analysis          ? { analysis }                               : {}),
            ...(referenceAnalysis ? { reference_analysis: referenceAnalysis } : {}),
            ...(overrides         ? { overrides }                              : {}),
          }),
          signal: AbortSignal.timeout(540000), // 9 min timeout
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          throw new Error(`Mastering-Service nicht erreichbar (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ""}`);
        }

        // Stream SSE from Python
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = "";
        let pythonCompleted = false;
        let finalPayload: Record<string, unknown> | null = null;
        let pythonError = "";

        outer: while (true) {
          const { done, value } = await reader.read();

          if (done) {
            buffer += decoder.decode();
            if (buffer.trim()) {
              for (const chunk of buffer.split("\n\n")) {
                const line = chunk.trim();
                if (!line.startsWith("data: ")) continue;
                try {
                  const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
                  if (data.step === "complete") { pythonCompleted = true; finalPayload = data; break outer; }
                  send(data);
                  if (data.error || data.step === "error") {
                    pythonError = typeof data.error === "string" ? data.error : "Mastering wurde abgebrochen";
                    break outer;
                  }
                } catch { /* ignore */ }
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            const line = chunk.trim();
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
              if (data.step === "complete") {
                pythonCompleted = true;
                finalPayload = data;
                break outer;
              } else if (data.error || data.step === "error") {
                send(data);
                pythonError = typeof data.error === "string" ? data.error : "Mastering wurde abgebrochen";
                break outer;
              } else {
                send(data);
              }
            } catch { /* ignore */ }
          }
        }

        if (!pythonCompleted) {
          throw new Error(pythonError || "Mastering-Service wurde ohne fertiges Ergebnis beendet");
        }

        // Persist results
        const validatedPayload = await validateMasterResult(finalPayload, masterId, format);
        await finalizeMaster(dbMasterId, userId, validatedPayload);
        send(validatedPayload);

      } catch (err) {
        console.error("Mastering error:", err);
        await Promise.all([
          db.master.update({ where: { id: dbMasterId }, data: { status: "error" } }).catch(() => {}),
          removeMasterFiles(masterId),
        ]);
        // Notify user about the failure
        if (userId) {
          try {
            const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
            if (user?.email) sendMasteringErrorEmail(user.email, originalName).catch((err) => console.error("[email] mastering-error:", err));
          } catch { /* ignore */ }
        }
        send({
          step: "error",
          progress: 0,
          error: err instanceof Error ? err.message : "Mastering fehlgeschlagen",
        });
        close();
        return;
      }

      close();
    },
    cancel() {
      // The mastering job deliberately continues in the background so its DB
      // record and downloadable result remain consistent after tab/navigation.
      clientConnected = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function validateMasterResult(
  payload: Record<string, unknown> | null,
  masterId: string,
  selectedFormat: string,
): Promise<Record<string, unknown>> {
  if (!payload || payload.step !== "complete" || payload.master_id !== masterId) {
    throw new Error("Mastering-Service lieferte keine gültige Abschlussbestätigung");
  }
  if (payload.selected_format !== selectedFormat) {
    throw new Error("Mastering-Service lieferte ein unerwartetes Ausgabeformat");
  }

  const postAnalysis = normalizeAnalysis(payload.post_analysis);
  if (!postAnalysis) {
    throw new Error("Mastering-Service lieferte ungültige Abschlussmesswerte");
  }

  const renderedFormats = findExistingMasterFormats(masterId);
  if (!renderedFormats.includes(selectedFormat)) {
    throw new Error(`Die angeforderte ${selectedFormat.toUpperCase()}-Datei wurde nicht erzeugt`);
  }
  const selectedExtension = FORMAT_EXTENSIONS[selectedFormat];
  const selectedPath = path.join(UPLOAD_DIR, "masters", `${masterId}_${selectedFormat}.${selectedExtension}`);
  const selectedStat = await stat(selectedPath);
  if (!selectedStat.isFile() || selectedStat.size === 0) {
    throw new Error("Die erzeugte Master-Datei ist leer oder ungültig");
  }

  // Never forward download URLs supplied by another service. Reconstruct them
  // exclusively from files that actually exist under our own master directory.
  const formats = Object.fromEntries(renderedFormats.map((renderedFormat) => [
    renderedFormat,
    `/api/download?master_id=${encodeURIComponent(masterId)}&format=${encodeURIComponent(renderedFormat)}`,
  ]));

  return {
    step: "complete",
    progress: 100,
    master_id: masterId,
    selected_format: selectedFormat,
    formats,
    post_analysis: postAnalysis,
    notes: typeof payload.notes === "string" ? payload.notes.slice(0, 2000) : "",
    params: payload.params && typeof payload.params === "object" && !Array.isArray(payload.params)
      ? payload.params : undefined,
    genre: typeof payload.genre === "string" ? payload.genre.slice(0, 80) : undefined,
  };
}

async function finalizeMaster(
  dbMasterId: string,
  userId: string,
  payload?: Record<string, unknown> | null,
) {
  const postAnalysis = payload?.post_analysis as Record<string, unknown> | undefined;
  const lufsOut = typeof postAnalysis?.integrated_lufs === "number" ? postAnalysis.integrated_lufs : null;
  const formats = payload?.formats && typeof payload.formats === "object"
    ? payload.formats as Record<string, unknown>
    : {};
  const savedPath = (key: string) => typeof formats[key] === "string" ? formats[key] as string : null;
  const selectedFormat = typeof payload?.selected_format === "string" ? payload.selected_format : null;
  const params = payload?.params && typeof payload.params === "object" ? payload.params : null;

  await db.master.update({
    where: { id: dbMasterId },
    data:  {
      status:       "done",
      completedAt:  new Date(),
      postAnalysis: postAnalysis ? JSON.stringify(postAnalysis) : null,
      aiParams:      JSON.stringify({ selectedFormat, params }),
      pathWav32:     savedPath("wav32"),
      pathWav24:     savedPath("wav24"),
      pathWav16:     savedPath("wav16"),
      pathFlac:      savedPath("flac"),
      pathMp3320:    savedPath("mp3320"),
      pathMp3128:    savedPath("mp3128"),
      pathAac256:    savedPath("aac256"),
      notes:         typeof payload?.genre === "string" ? payload.genre : (typeof payload?.notes === "string" ? payload.notes.slice(0, 80) : null),
    },
  });

  try {
    const [user, masterRecord] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { email: true } }),
      db.master.findUnique({ where: { id: dbMasterId }, select: { originalName: true, platform: true } }),
    ]);
    if (user?.email && masterRecord) {
      await sendMasteringCompleteEmail(user.email, masterRecord.originalName, masterRecord.platform, lufsOut);
    }
  } catch (mailErr) {
    console.error("Failed to send mastering complete email:", mailErr);
  }
}
