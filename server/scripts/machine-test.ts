import { createActor } from "xstate";
import { roundMachine } from "../src/roundMachine.js";

const actor = createActor(roundMachine);
const seen: string[] = [];
actor.subscribe((s) => {
  const v = String(s.value);
  if (seen[seen.length - 1] !== v) seen.push(v);
});
actor.start();
actor.send({ type: "START", totalRounds: 2, speechSeconds: 45 });
for (let i = 0; i < 80 && actor.getSnapshot().value !== "NEXT_ELECTION"; i++) {
  actor.send({ type: "SKIP" });
}
console.log(seen.join(" -> "));
actor.stop();
process.exit(0);