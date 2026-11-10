import { Room, Client } from "colyseus";
import { LobbyState, LobbyPlayer } from "./LobbyState.js";
import { createActor } from "xstate";
import { roundMachine } from "./roundMachine.js";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O, easy to read aloud
const usedCodes = new Set<string>();

function makeCode(): string {
  let code = "";
  do {
    code = Array.from({ length: 4 }, () =>
      LETTERS[Math.floor(Math.random() * LETTERS.length)]
    ).join("");
  } while (usedCodes.has(code));
  usedCodes.add(code);
  return code;
}

export class GameRoom extends Room<{ state: LobbyState }> {
  maxClients = 12;
  private actor = createActor(roundMachine);

  onCreate() {
    this.roomId = makeCode(); // players join with joinById("ABCD")
    this.setState(new LobbyState());
    this.state.code = this.roomId;

    this.actor.subscribe((snap) => {
      this.state.phase = String(snap.value);
      this.state.phaseEndsAt = snap.context.phaseEndsAt;
      this.state.round = snap.context.round;
      this.state.totalRounds = snap.context.totalRounds;
    });
    this.actor.start();

    this.onMessage("skip_phase", (client) => {
      if (client.sessionId === this.state.hostId) this.actor.send({ type: "SKIP" });
    });

    this.onMessage("set_name", (client, name: string) => {
      const p = this.state.players.get(client.sessionId);
      if (p && this.state.phase === "LOBBY") p.name = this.uniqueName(name, client.sessionId);
    });

    this.onMessage("set_avatar", (client, avatar: string) => {
      const p = this.state.players.get(client.sessionId);
      if (p && this.state.phase === "LOBBY") p.avatar = String(avatar).slice(0, 20);
    });

    this.onMessage("ready", (client, value: boolean) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.ready = !!value;
    });

    this.onMessage("start_game", (client) => {
      if (client.sessionId !== this.state.hostId) return;
      const n = this.state.players.size;
      if (n < 3) return;
      this.lock();
      this.actor.send({
        type: "START",
        totalRounds: n >= 9 ? 5 : 3, // section 2.3
        speechSeconds: 45,
      });
    });
  }

  onJoin(client: Client, options: { name?: string; avatar?: string }) {
    const p = new LobbyPlayer();
    p.id = client.sessionId;
    p.name = this.uniqueName(options?.name ?? "Guest", client.sessionId);
    p.avatar = options?.avatar ?? "frog";
    this.state.players.set(client.sessionId, p);
    if (!this.state.hostId) this.state.hostId = client.sessionId; // first in = host
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    if (client.sessionId === this.state.hostId) {
      const next = this.state.players.keys().next();
      this.state.hostId = next.done ? "" : next.value; // promote next player
    }
  }

  onDispose() {
    this.actor.stop();
    usedCodes.delete(this.roomId);
  }

  // "Priya", "Priya 2", "Priya 3" (the duplicate-name default)
  private uniqueName(raw: string, selfId: string): string {
    const base = String(raw).trim().slice(0, 16) || "Guest";
    const taken = new Set<string>();
    this.state.players.forEach((p, id) => {
      if (id !== selfId) taken.add(p.name);
    });
    let name = base;
    for (let n = 2; taken.has(name); n++) name = `${base} ${n}`;
    return name;
  }
}