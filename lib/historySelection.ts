/** Use existing authenticated, ownership-checked deletion; never delete optimistically. */
export async function deleteHistoryEntries(ids: string[], request: typeof fetch = fetch) {
  const deleted: string[] = [], failed: string[] = [];
  for (const id of new Set(ids)) {
    try {
      const response = await request(`/api/master/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) { failed.push(id); continue; }
      const result = await response.json();
      if (result.ok === true) deleted.push(id); else failed.push(id);
    } catch { failed.push(id); }
  }
  return { deleted, failed };
}
