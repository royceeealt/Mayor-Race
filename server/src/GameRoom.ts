import { Room, Client } from "colyseus";
import { LobbyState, LobbyPlayer } from "./LobbyState.js";

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

  onCreate() {
    this.roomId = makeCode(); // players join with joinById("ABCD")
    this.setState(new LobbyState());
    this.state.code = this.roomId;

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
      if (client.sessionId !== this.state.hostId) return; // host only
      if (this.state.players.size < 3) return;            // minimum 3
      this.lock();                                        // lobby-only joins
      this.state.phase = "ASSIGN_ROLES";                  // XState takes over next
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