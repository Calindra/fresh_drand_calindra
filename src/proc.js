import { spawn } from "node:child_process";

export function runProcess(path) {
  const prc = spawn(path);

  prc.on("exit", (code) => {
    process.exit(code);
  });

  process.on("SIGINT", () => {
    prc.kill("SIGINT");
    prc.kill("SIGTERM");
  });

  return prc;
}
