import type { AudioReleaseTool } from "./releaseTools";

export type HandoffTool = Extract<AudioReleaseTool, "release-check" | "mastering-blindtest" | "audio-visualizer">;
export type MasterForReleaseCheck = {id:string;format:string;name:string};
type Transfer = { tool: HandoffTool; source: File | MasterForReleaseCheck; expires: number };
const browser = () => window as Window & { beatzuckerReleaseTransfer?: Transfer };

export function offerReleaseFile(tool: HandoffTool, source: File | MasterForReleaseCheck) {
  const win = browser();
  const transfer = { tool, source, expires: Date.now() + 60_000 };
  win.beatzuckerReleaseTransfer = transfer;
  win.setTimeout(() => { if (win.beatzuckerReleaseTransfer === transfer) delete win.beatzuckerReleaseTransfer; }, 60_000);
}

export function receiveReleaseFile(tool: "release-check"): File|MasterForReleaseCheck|undefined;
export function receiveReleaseFile(tool: Exclude<HandoffTool,"release-check">): File|undefined;
export function receiveReleaseFile(tool: HandoffTool) {
  const win = browser();
  const transfer = win.beatzuckerReleaseTransfer;
  if (!transfer || transfer.tool !== tool) return undefined;
  delete win.beatzuckerReleaseTransfer;
  if(transfer.expires <= Date.now())return undefined;
  return tool==="release-check" || transfer.source instanceof File ? transfer.source : undefined;
}
