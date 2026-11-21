import type { ReactNode } from "react";
import styles from "./release-tools.module.css";

export function ToolPanel({ children }: { children: ReactNode }) {
  return <div className={styles.panel}>{children}</div>;
}
export function ToolError({ children }: { children: string }) {
  return children ? <p className={styles.error} role="alert">{children}</p> : null;
}
export function downloadToolBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
