// shared/src/constants.ts
// Numbers come from CLAUDE.md sections 2.2, 2.3, 2.5 and 6.4. Change them there first.

export const ROOM_CODE_LENGTH = 4;
// No I or O so codes are never confused with 1 or 0 when read aloud on Discord.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const RECOMMENDED_MIN_PLAYERS = 5; // 3 to 4 allowed as casual mode

export const AVATARS = [
  'frog', // Lolly
  'cat', // Zorp
  'shark', // Berry Bite
  'pigeon', // Mr. Coo
  'crab', // Pinchy
  'ladybug', // Dotty
  'shrimp', // Chef Prawn
  'puppy', // Daisy
  'fish', // Sir Finley
  'parrot', // Cap'n Squawk
  'duck', // Doug
  'rat', // Big Cheese
] as const;
export type Avatar = (typeof AVATARS)[number];

export const PHASES = [
  'LOBBY',
  'ASSIGN_ROLES',
  'ROLE_REVEAL',
  'ROUND_START',
  'PROMPT_VOTE',
  'PROMPT_RESULT',
  'SIDES_REVEALED',
  'SPEECH_1',
  'SPEECH_2',
  'DEBATE_CHAT',
  'BALLOT',
  'ROUND_RESULT',
  'TIEBREAK',
  'MAYOR_ANNOUNCED',
  'SECRET_REVEAL',
  'AWARDS',
  'NEXT_ELECTION',
] as const;
export type Phase = (typeof PHASES)[number];

/** Only these phases may be skipped by the host (skip_phase). Tweak as needed. */
export const SKIPPABLE_PHASES: readonly Phase[] = [
  'ROLE_REVEAL',
  'PROMPT_RESULT',
  'SPEECH_1',
  'SPEECH_2',
  'DEBATE_CHAT',
  'ROUND_RESULT',
];

/** Phases where boo / rumour / accuse may fire (section 6.4). */
export const ABILITY_PHASES: readonly Phase[] = ['SPEECH_1', 'SPEECH_2', 'DEBATE_CHAT', 'BALLOT'];

// Section 2.5. The server owns every timer; clients only display them.
export const TIMERS_SECONDS = {
  PROMPT_VOTE: 15,
  RUMOUR_REBUTTAL: 10,
  DEBATE_CHAT: 90,
  BALLOT: 20,
  SUDDEN_DEATH_SPEECH: 30,
  CANDIDATE_DISCONNECT_GRACE: 30,
  BOO_PENALTY: 5, // seconds cut from the speaker per tomato
} as const;
// Speech length is a host setting: 30 | 45 | 60 (default 45).
export const SPEECH_SECONDS_OPTIONS = [30, 45, 60] as const;
export const DEFAULT_SPEECH_SECONDS = 45;
// TODO(Royce): durations for ROLE_REVEAL, PROMPT_RESULT, ROUND_RESULT, AWARDS are not in the brief. Agree them.

export const ROLE_KEYS = ['candidate', 'townsperson', 'booing', 'rumour', 'snitch', 'biased'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];
export type SpecialRoleKey = Extract<RoleKey, 'booing' | 'rumour' | 'snitch' | 'biased'>;

// Section 2.1. Biased Guy has no uses; their ballot is forced.
export const ABILITY_LIMITS = {
  booing: { total: 3, perRound: Infinity },
  rumour: { total: 2, perRound: 1 },
  snitch: { total: 1, perRound: 1 },
  biased: { total: 0, perRound: 0 },
} as const satisfies Record<SpecialRoleKey, { total: number; perRound: number }>;

/** Section 2.2: which special roles are in play for N players. Always 2 candidates. */
export function specialRolesForPlayerCount(n: number): SpecialRoleKey[] {
  if (n <= 3) return [];
  if (n === 4) return ['booing'];
  if (n === 5) return ['booing', 'snitch'];
  if (n <= 7) return ['booing', 'snitch', 'biased'];
  return ['booing', 'rumour', 'snitch', 'biased'];
}

/** With N players there are N - 2 voters (candidates cannot vote). */
export const voterCount = (playerCount: number) => Math.max(0, playerCount - 2);

/** Section 2.3: 3 rounds by default, 5 with 9 or more players. */
export const defaultRounds = (playerCount: number) => (playerCount >= 9 ? 5 : 3);

export const PROMPT_OPTIONS_PER_VOTE = 3;

// Server -> client events (section 6.6).
export const SERVER_EVENTS = [
  'state_changed',
  'timer_tick',
  'role_assigned', // private
  'rumour_shown',
  'accusation_result',
  'round_result',
  'game_result',
] as const;
export type ServerEvent = (typeof SERVER_EVENTS)[number];
