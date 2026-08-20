import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pythonDir = path.join(projectDir, "python");
const venvPython = process.platform === "win32"
  ? path.join(pythonDir, "venv", "Scripts", "python.exe")
  : path.join(pythonDir, "venv", "bin", "python");
const executable = existsSync(venvPython)
  ? venvPython
  : (process.platform === "win32" ? "python" : "python3");
// Next.js resolves the default ./uploads directory from the project root,
// while Uvicorn runs inside /python. Pass one absolute directory to both so
// local API requests are not rejected as being outside Python's allow-list.
const uploadDir = path.resolve(projectDir, process.env.TEMP_UPLOAD_DIR || "uploads");

const child = spawn(
  executable,
  ["-m", "uvicorn", "main:app", "--port", "8001", "--reload"],
  { cwd: pythonDir, stdio: "inherit", shell: false, env: { ...process.env, TEMP_UPLOAD_DIR: uploadDir } },
);

child.on("error", (error) => {
  console.error(`[python-dev] Could not start ${executable}: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}
