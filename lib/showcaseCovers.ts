export const SHOWCASE_COVERS = ["prism-tunnel", "liquid-orbit", "neon-dunes", "glass-monolith", "aurora-grid", "sonic-bloom", "back-to-my-acid", "lass-mich-nicht-allein", "on-tour", "xplore-belgium"].map(name => `/images/showcase/${name}-v1.webp`);
export const COVER_STORAGE_KEY = "beatzucker-showcase-covers-v1";
export function validCoverHistory(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, url]) => /^[a-z0-9-]{1,90}$/.test(id) && typeof url === "string" && SHOWCASE_COVERS.includes(url)));
}
/** Unique covers within the page; each track avoids its last-visit cover. No user identifier. */
export function assignShowcaseCovers(ids: string[], previous: Record<string, string>, random = Math.random, existing: Record<string, string> = {}) {
  const result: Record<string, string> = {}, used = new Set<string>();
  for (const id of ids.slice(0, 5)) if (SHOWCASE_COVERS.includes(existing[id]) && !used.has(existing[id])) { result[id] = existing[id]; used.add(existing[id]); }
  for (const id of ids.slice(0, 5)) {
    if (result[id]) continue;
    const choices = SHOWCASE_COVERS.filter(url => !used.has(url) && url !== previous[id]);
    const choice = choices[Math.max(0, Math.min(choices.length - 1, Math.floor(random() * choices.length)))];
    result[id] = choice; used.add(choice);
  }
  return result;
}
