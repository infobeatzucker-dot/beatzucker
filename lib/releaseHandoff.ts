import type { AudioReleaseTool } from "./releaseTools";

export type HandoffTool = Extract<AudioReleaseTool, "release-check" | "mastering-blindtest" | "audio-visualizer">;
type Transfer = { tool: HandoffTool; file: File; expires: number };
const browser = () => window as Window & { beatzuckerReleaseTransfer?: Transfer };

export function offerReleaseFile(tool: HandoffTool, file: File) {
  const win = browser();
  const transfer = { tool, file, expires: Date.now() + 60_000 };
  win.beatzuckerReleaseTransfer = transfer;
  win.setTimeout(() => { if (win.beatzuckerReleaseTransfer === transfer) delete win.beatzuckerReleaseTransfer; }, 60_000);
}

export function receiveReleaseFile(tool: HandoffTool) {
  const win = browser();
  const transfer = win.beatzuckerReleaseTransfer;
  if (!transfer || transfer.tool !== tool) return undefined;
  delete win.beatzuckerReleaseTransfer;
  return transfer.expires > Date.now() ? transfer.file : undefined;
}
