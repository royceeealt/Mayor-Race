// Pure game model for one room (no Colyseus, no timers). The room class wires it to sockets.
// Everything here is the full truth (ServerPlayer holds secrets). Never serialise it: use views.ts.
import {
  AVATARS,
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RECOMMENDED_MIN_PLAYERS,
  defaultRounds,
  type Avatar,
  type Phase,
  type ServerPlayer,
  type Settings,
} from '@mayor-race/shared';

export class RoomError extends Error {
  constructor(public code: 'ROOM_FULL' | 'INVALID_OPTIONS') {
    super(code);
  }
}

export interface JoinResult {
  player: ServerPlayer;
  /** True when the person joined as a read-only spectator because the game already started. */
  spectator: boolean;
}

export interface LeaveResult {
  removed: boolean;
  name: string;
  newHostId?: string;
}

/** "Priya", "Priya 2", "Priya 3"... Case-insensitive, keeps within the 16 character name limit. */
export function uniqueName(wanted: string, taken: string[], max = 16): string {
  const lower = new Set(taken.map((n) => n.toLowerCase()));
  const base = wanted.trim().slice(0, max);
  if (!lower.has(base.toLowerCase())) return base;
  for (let i = 2; i < 100; i++) {
    const suffix = ` ${i}`;
    const candidate = base.slice(0, max - suffix.length).trimEnd() + suffix;
    if (!lower.has(candidate.toLowerCase())) return candidate;
  }
  return base;
}

export class RoomModel {
  phase: Phase = 'LOBBY';
  phaseEndsAt: number | null = null;
  settings: Settings;
  players = new Map<string, ServerPlayer>(); // insertion order = join order (used for host promotion)
  mayorId?: string;
  private roundsTouched = false;

  constructor(
    public readonly code: string,
    settings: Partial<Settings> = {},
  ) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings } as Settings;
    this.settings.maxPlayers = clamp(this.settings.maxPlayers, MIN_PLAYERS, MAX_PLAYERS);
    this.roundsTouched = settings.rounds !== undefined;
  }

  get seated(): ServerPlayer[] {
    return [...this.players.values()].filter((p) => !p.spectator);
  }
  get host(): ServerPlayer | undefined {
    return [...this.players.values()].find((p) => p.isHost);
  }
  get inLobby() {
    return this.phase === 'LOBBY';
  }
  get isFull() {
    return this.inLobby && this.seated.length >= this.settings.maxPlayers;
  }
  /** Players still connected and playing (used for the "fewer than 3 remain" rule). */
  get connectedSeatedCount() {
    return this.seated.filter((p) => p.connected).length;
  }

  join(id: string, opts: { name: string; avatar: Avatar }): JoinResult {
    if (this.isFull) throw new RoomError('ROOM_FULL');
    const spectator = !this.inLobby; // late joiners: lobby only, spectators afterwards (section 2.6)
    const name = uniqueName(opts.name, [...this.players.values()].map((p) => p.name));
    const avatar = this.freeAvatar(opts.avatar);
    const player: ServerPlayer = {
      id,
      name,
      avatar,
      connected: true,
      isHost: false,
      ready: false,
      role: 'townsperson',
      usesLeft: 0,
      usesThisRound: 0,
      abilityLost: false,
      score: 0,
      spectator,
    };
    this.players.set(id, player);
    if (!spectator && !this.host) player.isHost = true;
    return { player, spectator };
  }

  leave(id: string): LeaveResult {
    const p = this.players.get(id);
    if (!p) return { removed: false, name: '' };
    let removed = false;
    if (this.inLobby || p.spectator) {
      this.players.delete(id);
      removed = true;
    } else {
      p.connected = false; // keep seat so the round survives; reconnection comes in week 3
    }
    const wasHost = p.isHost;
    if (wasHost) p.isHost = false;
    const result: LeaveResult = { removed, name: p.name };
    if (wasHost) {
      const next = this.seated.find((q) => q.connected && q.id !== id);
      if (next) {
        next.isHost = true;
        result.newHostId = next.id;
      }
    }
    return result;
  }

  setReady(id: string, ready: boolean) {
    const p = this.players.get(id);
    if (p && this.inLobby && !p.spectator) p.ready = ready;
  }

  setName(id: string, name: string) {
    const p = this.players.get(id);
    if (!p || !this.inLobby) return;
    const others = [...this.players.values()].filter((q) => q.id !== id).map((q) => q.name);
    p.name = uniqueName(name, others);
  }

  /** Returns false if the avatar is already taken by someone else (the UI shows it greyed out). */
  setAvatar(id: string, avatar: Avatar): boolean {
    const p = this.players.get(id);
    if (!p || !this.inLobby) return false;
    const takenByOther = [...this.players.values()].some((q) => q.id !== id && !q.spectator && q.avatar === avatar);
    if (takenByOther) return false;
    p.avatar = avatar;
    return true;
  }

  /** Host only. Returns the removed player id, or undefined if the kick was rejected. */
  kick(byId: string, targetId: string): string | undefined {
    if (!this.inLobby || byId === targetId || !this.players.get(byId)?.isHost) return undefined;
    if (!this.players.has(targetId)) return undefined;
    this.players.delete(targetId);
    return targetId;
  }

  changeSettings(byId: string, patch: Partial<Settings>): boolean {
    if (!this.inLobby || !this.players.get(byId)?.isHost) return false;
    const next = { ...this.settings, ...patch };
    // Never allow a cap below the people already seated.
    next.maxPlayers = clamp(next.maxPlayers, Math.max(MIN_PLAYERS, this.seated.length), MAX_PLAYERS);
    if (patch.rounds !== undefined) this.roundsTouched = true;
    this.settings = next;
    return true;
  }

  canStart(byId: string): boolean {
    return this.inLobby && !!this.players.get(byId)?.isHost && this.seated.length >= MIN_PLAYERS;
  }

  /** Locks in settings that depend on player count. Call right before the machine starts. */
  prepareStart() {
    const n = this.seated.length;
    if (!this.roundsTouched) this.settings.rounds = defaultRounds(n);
    if (n < RECOMMENDED_MIN_PLAYERS) this.settings.casualMode = true; // 3 to 4 players = casual (brief 2.2)
    for (const p of this.players.values()) p.ready = false;
  }

  /** Back to the lobby: same players, fresh state (rematch or abort). Spectators become players if there is room. */
  resetToLobby() {
    this.phase = 'LOBBY';
    this.phaseEndsAt = null;
    this.mayorId = undefined;
    for (const [id, p] of this.players) {
      if (!p.connected) {
        this.players.delete(id);
        continue;
      }
      Object.assign(p, {
        role: 'townsperson',
        candidateSlot: undefined,
        usesLeft: 0,
        usesThisRound: 0,
        abilityLost: false,
        favourite: undefined,
        score: 0,
        ready: false,
      });
    }
    for (const p of this.players.values()) {
      if (p.spectator && this.seated.length < this.settings.maxPlayers) p.spectator = false;
    }
    if (!this.host) {
      const next = this.seated[0];
      if (next) next.isHost = true;
    }
  }

  private freeAvatar(wanted: Avatar): Avatar {
    const used = new Set([...this.players.values()].filter((p) => !p.spectator).map((p) => p.avatar));
    if (!used.has(wanted)) return wanted;
    return AVATARS.find((a) => !used.has(a)) ?? wanted;
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
