import seedrandom from "seedrandom";
import { runNonodo } from "./nonodo.js";

async function main() {
  const rng = seedrandom("hello.", { global: true });
  console.log(Math.random()); // Always 0.9282578795792454
  runNonodo();
}

main().catch((error) => {
  console.error(error);
});
