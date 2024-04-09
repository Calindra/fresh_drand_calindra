import { resolve } from "node:path";
import { runProcess } from "./proc.js";

export function runNonodo() {
  const path = resolve("node_modules/.bin/nonodo");
  return runProcess(path);
}
