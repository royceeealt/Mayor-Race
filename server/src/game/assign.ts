// Candidate and role assignment (CLAUDE.md 2.1, 2.2). Pure logic: no sockets, no timers.
// Call it once, right before the machine leaves the lobby. Roles stay secret: views.ts decides who sees what.
import {
  ABILITY_LIMITS,
  specialRolesForPlayerCount,
  type ServerPlayer,
  type Settings,
  type SpecialRoleKey,
} from '@mayor-race/shared';

export type Rng = () => number;

/** Fisher-Yates. Returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface AssignOptions {
  candidateMode: Settings['candidateMode'];
  rolesEnabled: boolean;
  /** Player ids who volunteered. Only used when candidateMode is 'chosen'. Missing slots are filled at random. */
  volunteers?: string[];
  rng?: Rng;
}

/**
 * Mutates the players: picks 2 candidates (slot A = red, B = blue), then hands out the special roles
 * for this player count to random townspeople. Spectators and disconnected players are skipped.
 * Returns the candidate ids as [A, B].
 */
export function assignRoles(players: ServerPlayer[], opts: AssignOptions): [string, string] {
  const rng = opts.rng ?? Math.random;
  const pool = players.filter((p) => !p.spectator && p.connected);
  if (pool.length < 3) throw new Error('assignRoles needs at least 3 players');

  // Clean slate (this also makes rematches safe).
  for (const p of players) {
    p.role = 'townsperson';
    p.candidateSlot = undefined;
    p.usesLeft = 0;
    p.usesThisRound = 0;
    p.abilityLost = false;
    p.favourite = undefined;
  }

  // 1. Candidates.
  const wanted = opts.candidateMode === 'chosen' ? (opts.volunteers ?? []) : [];
  const volunteerPool = shuffle(pool.filter((p) => wanted.includes(p.id)), rng);
  const others = shuffle(pool.filter((p) => !wanted.includes(p.id)), rng);
  const candidates = [...volunteerPool, ...others].slice(0, 2);
  // Shuffle again so a lone volunteer is not always the red candidate.
  const [a, b] = shuffle(candidates, rng);
  a.role = 'candidate';
  a.candidateSlot = 'A';
  b.role = 'candidate';
  b.candidateSlot = 'B';

  // 2. Special roles for the townspeople.
  const voters = shuffle(pool.filter((p) => p.role !== 'candidate'), rng);
  const specials: SpecialRoleKey[] = opts.rolesEnabled ? specialRolesForPlayerCount(pool.length) : [];
  specials.forEach((role, i) => {
    const p = voters[i];
    if (!p) return;
    p.role = role;
    p.usesLeft = ABILITY_LIMITS[role].total;
    if (role === 'biased') p.favourite = rng() < 0.5 ? a.id : b.id; // secret: never leaves the server until the reveal
  });

  return [a.id, b.id];
}
