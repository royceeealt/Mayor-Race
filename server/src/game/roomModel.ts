
// Pure game model for one room (no Colyseus, no timers).
// The room class wires it to sockets.
// Everything here is the full truth (ServerPlayer holds secrets).
// Never serialise it: use views.ts.

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
  type ServerRound,
  type Settings,
} from '@mayor-race/shared';

export class RoomError extends Error {
  constructor(public code: 'ROOM_FULL' | 'INVALID_OPTIONS') {
    super(code);
  }
}

export interface JoinResult {
  player: ServerPlayer;
  spectator: boolean;
}

export interface LeaveResult {
  removed: boolean;
  name: string;
  newHostId?: string;
}

/** "Priya", "Priya 2", "Priya 3"... */
export function uniqueName(
  wanted: string,
  taken: string[],
  max = 16,
): string {
  const lower = new Set(taken.map((n) => n.toLowerCase()));
  const base = wanted.trim().slice(0, max);

  if (!lower.has(base.toLowerCase())) return base;

  for (let i = 2; i < 100; i++) {
    const suffix = ` ${i}`;
    const candidate =
      base.slice(0, max - suffix.length).trimEnd() + suffix;

    if (!lower.has(candidate.toLowerCase())) return candidate;
  }

  return base;
}

export class RoomModel {
  phase: Phase = 'LOBBY';
  phaseEndsAt: number | null = null;
  settings: Settings;

  players = new Map<string, ServerPlayer>();

  // --------------------------------
  // GAME STATE
  // --------------------------------

  mayorId?: string;

  candidateIds: [string, string] | null = null;

  currentRound: ServerRound | null = null;

  roundHistory: ServerRound[] = [];

  currentRoundIndex = 0;

  totalRounds = 3;

  roundWins: Record<string, number> = {};

  usedPromptIds: string[] = [];

  // --------------------------------
  // SPEECH STATE
  // --------------------------------

  /** Candidate currently giving their speech. */
  speakerId: string | null = null;

  /** Total seconds removed from the current speaker's speech. */
  speechPenaltySeconds = 0;

  /** Unconfirmed ballot selections; server-only and never included in a view. */
  private pendingBallots = new Map<string, string>();

  private roundsTouched = false;

  constructor(
    public readonly code: string,
    settings: Partial<Settings> = {},
  ) {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...settings,
    } as Settings;

    this.settings.maxPlayers = clamp(
      this.settings.maxPlayers,
      MIN_PLAYERS,
      MAX_PLAYERS,
    );

    this.roundsTouched = settings.rounds !== undefined;
  }

  // --------------------------------
  // GETTERS
  // --------------------------------

  get seated(): ServerPlayer[] {
    return [...this.players.values()].filter(
      (p) => !p.spectator,
    );
  }

  get host(): ServerPlayer | undefined {
    return [...this.players.values()].find(
      (p) => p.isHost,
    );
  }

  get inLobby() {
    return this.phase === 'LOBBY';
  }

  get isFull() {
    return (
      this.inLobby &&
      this.seated.length >= this.settings.maxPlayers
    );
  }

  get connectedSeatedCount() {
    return this.seated.filter((p) => p.connected).length;
  }

  // --------------------------------
  // ROUND MANAGEMENT
  // --------------------------------

  /** Creates an empty round with all required server-side fields. */
  private createEmptyRound(index: number): ServerRound {
    return {
      index,
      promptOptionIds: [],
      promptVotes: {},
      sides: {},
      ballots: {},
      boosUsed: 0,
      boosOnSpeaker: {},
      rumours: [],
    };
  }

  /** Initializes a new game after candidates have been assigned. */
  startGame(candidateIds: [string, string]): void {
    if (!this.inLobby) {
      throw new Error('Game has already started');
    }

    if (this.seated.length < MIN_PLAYERS) {
      throw new Error('Not enough players');
    }

    const [candidateA, candidateB] = candidateIds;

    if (
      candidateA === candidateB ||
      !this.players.has(candidateA) ||
      !this.players.has(candidateB)
    ) {
      throw new Error('Invalid candidate IDs');
    }

    const playerA = this.players.get(candidateA)!;
    const playerB = this.players.get(candidateB)!;

    if (playerA.spectator || playerB.spectator) {
      throw new Error('Candidates must be seated players');
    }

    this.candidateIds = [candidateA, candidateB];

    this.totalRounds = this.settings.rounds;
    this.currentRoundIndex = 0;
    this.currentRound = null;
    this.roundHistory = [];
    this.usedPromptIds = [];
    this.clearPendingBallots();

    this.speakerId = null;
    this.speechPenaltySeconds = 0;

    this.roundWins = {
      [candidateA]: 0,
      [candidateB]: 0,
    };

    this.mayorId = undefined;
  }

  /** Starts the next round. */
  startRound(): ServerRound {
    if (!this.candidateIds) {
      throw new Error('Candidates have not been assigned');
    }

    if (this.currentRound) {
      throw new Error('A round is already active');
    }

    if (this.currentRoundIndex >= this.totalRounds) {
      throw new Error('All rounds have been completed');
    }

    // Clear any unconfirmed selections from a previous ballot.
    this.clearPendingBallots();

    // Reset per-round ability usage counters.
    for (const player of this.players.values()) {
      player.usesThisRound = 0;
    }

    this.speakerId = null;
    this.speechPenaltySeconds = 0;

    this.currentRound = this.createEmptyRound(
      this.currentRoundIndex,
    );

    return this.currentRound;
  }

  /** Safely retrieves the active round. */
  getCurrentRound(): ServerRound {
    if (!this.currentRound) {
      throw new Error('No active round');
    }

    return this.currentRound;
  }

  // --------------------------------
  // SPEECH MANAGEMENT
  // --------------------------------

  /**
   * Sets the candidate who is currently speaking.
   * Only assigned candidates can become speakers.
   */
  startSpeech(speakerId: string): boolean {
    const round = this.currentRound;

    if (!round || !this.candidateIds) {
      return false;
    }

    if (!this.candidateIds.includes(speakerId)) {
      return false;
    }

    const speaker = this.players.get(speakerId);

    if (!speaker || speaker.spectator) {
      return false;
    }

    this.speakerId = speakerId;
    this.speechPenaltySeconds = 0;

    return true;
  }

  /**
   * Records additional speech penalty seconds.
   * The caller must validate the tomato action and penalty limit.
   */
  addSpeechPenalty(seconds: number): boolean {
    if (
      !this.speakerId ||
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {
      return false;
    }

    this.speechPenaltySeconds += seconds;

    return true;
  }

  /** Clears the current speaker and their speech penalty. */
  finishSpeech(): void {
    this.speakerId = null;
    this.speechPenaltySeconds = 0;
  }

  // --------------------------------
  // BALLOT MANAGEMENT
  // --------------------------------

  /** True only for a connected, seated non-candidate during BALLOT. */
  isEligibleBallotVoter(voterId: string): boolean {
    const player = this.players.get(voterId);

    return (
      this.phase === 'BALLOT' &&
      !!this.currentRound &&
      !!this.candidateIds &&
      !!player &&
      player.connected &&
      !player.spectator &&
      player.role !== 'candidate'
    );
  }

  /** Stores a private, unconfirmed candidate selection for this voter. */
  setPendingBallot(voterId: string, candidateId: string): boolean {
    if (!this.isEligibleBallotVoter(voterId)) return false;
    if (!this.candidateIds?.includes(candidateId)) return false;

    const round = this.currentRound!;
    if (round.ballots[voterId] !== undefined) return false;

    this.pendingBallots.set(voterId, candidateId);
    return true;
  }

  getPendingBallot(voterId: string): string | undefined {
    return this.pendingBallots.get(voterId);
  }

  clearPendingBallot(voterId: string): void {
    this.pendingBallots.delete(voterId);
  }

  clearPendingBallots(): void {
    this.pendingBallots.clear();
  }

  /** Records a ballot only when it matches the voter's pending selection. */
  recordBallot(voterId: string, candidateId: string): boolean {
    if (!this.isEligibleBallotVoter(voterId)) return false;
    if (!this.candidateIds?.includes(candidateId)) return false;

    const round = this.currentRound!;
    if (round.ballots[voterId] !== undefined) return false;
    if (this.pendingBallots.get(voterId) !== candidateId) return false;

    round.ballots[voterId] = candidateId;
    this.pendingBallots.delete(voterId);
    return true;
  }

  // --------------------------------
  // ROUND COMPLETION
  // --------------------------------

  /**
   * Saves the completed round and advances the round index.
   * Call only after the round result has been calculated.
   */
  resetRound(): void {
    if (!this.currentRound) {
      throw new Error('No active round to complete');
    }

    this.roundHistory.push(
      structuredClone(this.currentRound),
    );

    this.currentRoundIndex += 1;
    this.currentRound = null;

    this.finishSpeech();
  }

  // --------------------------------
  // PLAYER MANAGEMENT
  // --------------------------------

  join(
    id: string,
    opts: { name: string; avatar: Avatar },
  ): JoinResult {
    if (this.isFull) {
      throw new RoomError('ROOM_FULL');
    }

    const spectator = !this.inLobby;

    const name = uniqueName(
      opts.name,
      [...this.players.values()].map((p) => p.name),
    );

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

    if (!spectator && !this.host) {
      player.isHost = true;
    }

    return { player, spectator };
  }

  leave(id: string): LeaveResult {
    const p = this.players.get(id);

    if (!p) {
      return { removed: false, name: '' };
    }

    this.clearPendingBallot(id);

    let removed = false;

    if (this.inLobby || p.spectator) {
      this.players.delete(id);
      removed = true;
    } else {
      p.connected = false;
    }

    const wasHost = p.isHost;

    if (wasHost) {
      p.isHost = false;
    }

    const result: LeaveResult = {
      removed,
      name: p.name,
    };

    if (wasHost) {
      const next = this.seated.find(
        (q) => q.connected && q.id !== id,
      );

      if (next) {
        next.isHost = true;
        result.newHostId = next.id;
      }
    }

    return result;
  }

  setReady(id: string, ready: boolean) {
    const p = this.players.get(id);

    if (p && this.inLobby && !p.spectator) {
      p.ready = ready;
    }
  }

  setName(id: string, name: string) {
    const p = this.players.get(id);

    if (!p || !this.inLobby) return;

    const others = [...this.players.values()]
      .filter((q) => q.id !== id)
      .map((q) => q.name);

    p.name = uniqueName(name, others);
  }

  setAvatar(id: string, avatar: Avatar): boolean {
    const p = this.players.get(id);

    if (!p || !this.inLobby) return false;

    const takenByOther = [...this.players.values()].some(
      (q) =>
        q.id !== id &&
        !q.spectator &&
        q.avatar === avatar,
    );

    if (takenByOther) return false;

    p.avatar = avatar;

    return true;
  }

  kick(
    byId: string,
    targetId: string,
  ): string | undefined {
    if (
      !this.inLobby ||
      byId === targetId ||
      !this.players.get(byId)?.isHost
    ) {
      return undefined;
    }

    if (!this.players.has(targetId)) {
      return undefined;
    }

    this.clearPendingBallot(targetId);
    this.players.delete(targetId);

    return targetId;
  }

  // --------------------------------
  // SETTINGS
  // --------------------------------

  changeSettings(
    byId: string,
    patch: Partial<Settings>,
  ): boolean {
    if (
      !this.inLobby ||
      !this.players.get(byId)?.isHost
    ) {
      return false;
    }

    const next = {
      ...this.settings,
      ...patch,
    };

    next.maxPlayers = clamp(
      next.maxPlayers,
      Math.max(MIN_PLAYERS, this.seated.length),
      MAX_PLAYERS,
    );

    if (patch.rounds !== undefined) {
      this.roundsTouched = true;
    }

    this.settings = next;

    return true;
  }

  canStart(byId: string): boolean {
    return (
      this.inLobby &&
      !!this.players.get(byId)?.isHost &&
      this.seated.length >= MIN_PLAYERS
    );
  }

  /** Locks settings before the game starts. */
  prepareStart() {
    const n = this.seated.length;

    if (!this.roundsTouched) {
      this.settings.rounds = defaultRounds(n);
    }

    if (n < RECOMMENDED_MIN_PLAYERS) {
      this.settings.casualMode = true;
    }

    for (const p of this.players.values()) {
      p.ready = false;
    }
  }

  // --------------------------------
  // REMATCH / RESET
  // --------------------------------

  /** Returns the room to the lobby with fresh game state. */
  resetToLobby() {
    this.phase = 'LOBBY';
    this.phaseEndsAt = null;
    this.mayorId = undefined;

    // Reset all game-level state.
    this.candidateIds = null;
    this.currentRound = null;
    this.roundHistory = [];
    this.currentRoundIndex = 0;
    this.totalRounds = this.settings.rounds;
    this.roundWins = {};
    this.usedPromptIds = [];
    this.clearPendingBallots();

    // Reset speech state.
    this.speakerId = null;
    this.speechPenaltySeconds = 0;

    // Reset player state.
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

    // Allow spectators to become players if space is available.
    for (const p of this.players.values()) {
      if (
        p.spectator &&
        this.seated.length < this.settings.maxPlayers
      ) {
        p.spectator = false;
      }
    }

    // Restore a host if necessary.
    if (!this.host) {
      const next = this.seated[0];

      if (next) {
        next.isHost = true;
      }
    }
  }

  // --------------------------------
  // PRIVATE HELPERS
  // --------------------------------

  private freeAvatar(wanted: Avatar): Avatar {
    const used = new Set(
      [...this.players.values()]
        .filter((p) => !p.spectator)
        .map((p) => p.avatar),
    );

    if (!used.has(wanted)) {
      return wanted;
    }

    return AVATARS.find((a) => !used.has(a)) ?? wanted;
  }
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));
