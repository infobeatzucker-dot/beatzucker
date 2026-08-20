const UNSAFE_FILENAME_CHARS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g;

/** Preserve a human-readable Unicode filename while removing path/control data. */
export function sanitizeOriginalFilename(value: unknown, fallback = "track"): string {
  if (typeof value !== "string") return fallback;
  const basename = value.split(/[\\/]/).pop() ?? "";
  const clean = basename.normalize("NFC").replace(UNSAFE_FILENAME_CHARS, "").trim().slice(0, 180);
  return clean || fallback;
}
