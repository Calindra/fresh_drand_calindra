import seedrandom from "seedrandom";
import { runNonodo } from "./nonodo.js";
import { runDrand } from "./drand.js"

async function main() {
  const rng = seedrandom("hello.", { global: true });
  console.log(Math.random()); // Always 0.9282578795792454

  const runnable = await Promise.all(
    [runNonodo(), runDrand()]
  );

  console.log("Done");
}

main().catch((error) => {
  console.error(error);
});
