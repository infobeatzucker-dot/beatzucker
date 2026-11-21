import { neutral, type Settings } from "./settings";

export type Snapshot = { settings: Settings; target: number | null; label: string };
export type Snapshots = [Snapshot | null, Snapshot | null];
export const snapshotKey = "beatzucker_mastering_lab_snapshots_v1";

const number = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 20000;

function sameShape(value: unknown, reference: unknown): boolean {
  if (typeof reference === "number") return number(value);
  if (typeof reference === "boolean") return typeof value === "boolean";
  if (Array.isArray(reference)) {
    return Array.isArray(value) && reference.length === value.length && reference.every((item, i) => sameShape(value[i], item));
  }
  return Boolean(value && typeof value === "object" && reference && typeof reference === "object" &&
    Object.entries(reference).every(([key, shape]) => sameShape((value as Record<string, unknown>)[key], shape)));
}

export function storedSnapshots(value: string | null): Snapshots {
  try {
    const parsed = value ? JSON.parse(value) : [];
    const read = (data: unknown): Snapshot | null => {
      if (!data || typeof data !== "object") return null;
      const input = data as Snapshot;
      const oldSettings: Partial<Settings> | undefined = input.settings;
      if (!oldSettings?.active) return null;
      const settings = {
        duckDepth: neutral.duckDepth, duckFrequency: neutral.duckFrequency,
        duckThreshold: neutral.duckThreshold, duckRelease: neutral.duckRelease,
        ...oldSettings,
        active: { ...oldSettings.active, ducking: oldSettings.active.ducking ?? false },
      };
      if (!sameShape(settings, neutral) ||
        (input.target !== null && (!number(input.target) || input.target < -23 || input.target > -6))) return null;
      return { settings: settings as Settings, target: input.target, label: typeof input.label === "string" ? input.label.slice(0, 80) : "" };
    };
    if (Array.isArray(parsed)) return [read(parsed[0]), read(parsed[1])];
  } catch { /* Invalid or older local data. */ }
  return [null, null];
}
