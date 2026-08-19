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

const child = spawn(
  executable,
  ["-m", "uvicorn", "main:app", "--port", "8001", "--reload"],
  { cwd: pythonDir, stdio: "inherit", shell: false },
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
