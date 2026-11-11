// shared/src/constants.ts
// Numbers come from CLAUDE.md sections 2.2, 2.3, 2.5 and 6.4. Change them there first.

export const ROOM_CODE_LENGTH = 4;
// No I or O so codes are never confused with 1 or 0 when read aloud on Discord.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const RECOMMENDED_MIN_PLAYERS = 5; // 3 to 4 allowed as casual mode

// The 12 animal characters (brief section 5). Keys are stable ids; display names live in AVATAR_NAMES.
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
export const AVATAR_NAMES: Record<Avatar, string> = {
  frog: 'Lolly',
  cat: 'Zorp',
  shark: 'Berry Bite',
  pigeon: 'Mr. Coo',
  crab: 'Pinchy',
  ladybug: 'Dotty',
  shrimp: 'Chef Prawn',
  puppy: 'Daisy',
  fish: 'Sir Finley',
  parrot: "Cap'n Squawk",
  duck: 'Doug',
  rat: 'Big Cheese',
};

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

/**
 * Phases with no duration in the brief get a PLACEHOLDER here so the machine can run.
 * TODO(Royce): agree these with the team. 0 = advances immediately, null = waits for a player/host.
 * SPEECH_1 / SPEECH_2 use Settings.speechSeconds instead of the value here.
 */
export const PHASE_SECONDS: Record<Phase, number | null> = {
  LOBBY: null,
  ASSIGN_ROLES: 0,
  ROLE_REVEAL: 12, // placeholder
  ROUND_START: 3, // placeholder
  PROMPT_VOTE: TIMERS_SECONDS.PROMPT_VOTE,
  PROMPT_RESULT: 6, // placeholder
  SIDES_REVEALED: 5, // placeholder
  SPEECH_1: DEFAULT_SPEECH_SECONDS,
  SPEECH_2: DEFAULT_SPEECH_SECONDS,
  DEBATE_CHAT: TIMERS_SECONDS.DEBATE_CHAT,
  BALLOT: TIMERS_SECONDS.BALLOT,
  ROUND_RESULT: 10, // placeholder
  TIEBREAK: TIMERS_SECONDS.SUDDEN_DEATH_SPEECH,
  MAYOR_ANNOUNCED: 8, // placeholder
  SECRET_REVEAL: 15, // placeholder
  AWARDS: 15, // placeholder
  NEXT_ELECTION: null,
};

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

/** Defaults for a new room. Host changes them in the Create screen / lobby. */
export const DEFAULT_SETTINGS = {
  rounds: 3,
  speechSeconds: DEFAULT_SPEECH_SECONDS,
  promptTier: 'silly', // 'silly' | 'serious' | 'random' (random mixes both tiers per round)
  candidateMode: 'random',
  rolesEnabled: true,
  casualMode: false,
  maxPlayers: 8,
} as const;

/** Display helper: 'ABCD' -> 'AB-CD' (the lobby sign shows the code in pairs). */
export const formatRoomCode = (code: string) =>
  code.length === 4 ? `${code.slice(0, 2)}-${code.slice(2)}` : code;

// Server -> client events (section 6.6).
export const SERVER_EVENTS = [
  'state_changed',
  'timer_tick',
  'role_assigned', // private
  'rumour_shown',
  'accusation_result',
  'round_result',
  'game_result',
  'notice', // lobby/system notices: player left, host changed, kicked, game aborted
] as const;

export const NOTICE_KINDS = ['player_left', 'host_changed', 'kicked', 'game_aborted'] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];
export type ServerEvent = (typeof SERVER_EVENTS)[number];

/** Reasons a join can fail. The server throws these as the error message; the client maps them to overlays. */
export const JOIN_ERRORS = ['ROOM_NOT_FOUND', 'ROOM_FULL', 'INVALID_OPTIONS'] as const;
export type JoinError = (typeof JOIN_ERRORS)[number];

/** Client -> server message used by the lobby. Intent names match intentSchemas in schemas.ts. */
export const ROOM_NAME = 'mayor_room';
