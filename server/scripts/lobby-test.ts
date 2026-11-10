import { Client } from "@colyseus/sdk";

const client = new Client("ws://localhost:2567");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function show(label: string, room: any) {
  const names: string[] = [];
  room.state.players.forEach((p: any) => names.push(p.name));
  const host = room.state.players.get(room.state.hostId)?.name;
  console.log(label, { code: room.state.code, host, players: names, phase: room.state.phase });
}

async function main() {
  // 1. A creates the room and becomes host
  const a = await client.create("game", { name: "Royce" });
  await wait(200);
  show("1. A created:", a);

  // 2. B and C join by code. B has the same name as A.
  const b = await client.joinById(a.roomId, { name: "Royce" });
  const c = await client.joinById(a.roomId, { name: "Ashvika" });
  await wait(200);
  show("2. B and C joined (expect Royce 2):", a);

  // 3. Wrong code should fail
  try {
    await client.joinById("ZZZZ", { name: "Ghost" });
    console.log("3. FAIL: joined a room that doesn't exist");
  } catch {
    console.log("3. Wrong code rejected: OK");
  }

  // 4. Host leaves, next player should be promoted
  await a.leave();
  await wait(300);
  show("4. A left (host should be B):", b);

  // 5. Only 2 players left, so start_game must be ignored
  b.send("start_game");
  await wait(200);
  show("5. start with 2 players (phase should stay LOBBY):", b);

  // 6. A third player joins, host starts, phase should advance
  const d = await client.joinById(b.roomId, { name: "Sreenidhi" });
  await wait(200);
  c.send("start_game"); // non-host, must be ignored
  await wait(200);
  show("6a. non-host tried to start (should stay LOBBY):", b);
  b.send("start_game");
  await wait(200);
  show("6b. host started (expect ASSIGN_ROLES):", b);

  await Promise.all([b.leave(), c.leave(), d.leave()]);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});