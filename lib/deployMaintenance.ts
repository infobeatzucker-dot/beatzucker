import { existsSync } from "node:fs";

export function isDeploying() {
  return process.platform === "linux" && existsSync("/app/data/.release-drain");
}
