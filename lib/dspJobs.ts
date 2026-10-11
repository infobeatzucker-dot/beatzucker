import { pythonServiceHeaders } from "@/lib/pythonService";

/** Fail closed: callers must not delete files when worker state is unknown. */
export async function activeDspMasterIds(): Promise<Set<string>> {
  const response = await fetch(`${process.env.PYTHON_SERVICE_URL ?? "http://localhost:8001"}/jobs`, {
    headers: pythonServiceHeaders(), cache: "no-store", signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("DSP job state unavailable");
  const payload = await response.json();
  if (!Array.isArray(payload.active_master_ids) || !payload.active_master_ids.every((id: unknown) => typeof id === "string")) {
    throw new Error("Invalid DSP job state");
  }
  return new Set(payload.active_master_ids);
}
