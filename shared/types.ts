// shared/src/types.ts
//
// SECRECY RULE (CLAUDE.md 6.3): there are two families of types.
//   * Server* types: the full truth. Live in server/ memory only. NEVER serialised to a client.
//   * *View types: what a given client may see. Built per player by the server's filter.
// Clients import only *View types. If a field is secret, it must not exist on a View type
// unless it is optional and only filled for the player who owns it.

import type { Avatar, Phase, RoleKey, SpecialRoleKey } from './constants';

export type Side = 'agree' | 'disagree';
export type PromptTier = 'wholesome' | 'silly' | 'spicy';
export type CandidateSlot = 'A' | 'B'; // A = red, B = blue

export interface Settings {
  rounds: number;
  speechSeconds: 30 | 45 | 60;
  promptTier: PromptTier;
  candidateMode: 'random' | 'volunteers';
  rolesEnabled: boolean; // host can switch roles off
  casualMode: boolean; // no points, verdict and awards only
  maxPlayers: number; // 3 to 12
}

// ---------------------------------------------------------------------------
// SERVER-ONLY (never sent)
// ---------------------------------------------------------------------------

export interface ServerPlayer {
  id: string;
  name: string;
  avatar: Avatar;
  connected: boolean;
  isHost: boolean;
  ready: boolean;
  role: RoleKey;
  candidateSlot?: CandidateSlot;
  usesLeft: number;
  usesThisRound: number;
  abilityLost: boolean; // role-holder disconnected or was exposed
  favourite?: string; // Biased Guy only: candidate id
  score: number;
  spectator: boolean;
}

export interface ServerRound {
  index: number;
  promptOptionIds: string[];
  promptVotes: Record<string, string>; // voterId -> promptId (private until result)
  promptId?: string;
  sides: Partial<Record<string, Side>>; // candidateId -> side
  ballots: Record<string, string>; // voterId -> candidateId (private forever until reveal)
  boosUsed: number;
  boosOnSpeaker: Record<string, number>; // candidateId -> tomatoes taken
  rumours: { targetId: string; byId: string; cardId: string }[];
  accusation?: { by: string; target: string; claimed: SpecialRoleKey; correct?: boolean };
  winnerId?: string; // candidate id, or 'tie'
}

// ---------------------------------------------------------------------------
// CLIENT VIEWS (filtered per player)
// ---------------------------------------------------------------------------

/** What everyone may know about a player. Roles are NOT here (except candidate status). */
export interface PublicPlayerView {
  id: string;
  name: string;
  avatar: Avatar;
  connected: boolean;
  isHost: boolean;
  ready: boolean;
  isCandidate: boolean; // candidates are public
  candidateSlot?: CandidateSlot;
  spectator: boolean;
}

/** Only ever filled in for the player it describes. */
export interface SelfView {
  playerId: string;
  role: RoleKey | null; // null until ROLE_REVEAL
  usesLeft: number;
  favourite?: string; // Biased Guy only
  hasVotedPrompt: boolean;
  hasCastBallot: boolean;
}

export interface PromptOptionView {
  id: string;
  text: string;
  votes?: number; // live counts are shown during PROMPT_VOTE
}

export interface RoundView {
  index: number; // 0-based
  totalRounds: number;
  promptOptions?: PromptOptionView[];
  winningPrompt?: { id: string; text: string; percent: number };
  sides?: Partial<Record<string, Side>>;
  speakerId?: string;
  speechPenaltySeconds?: number; // total tomato time cut from the current speaker
  rumour?: { cardText: string; aboutId: string; rebuttalEndsAt: number };
  roundWins: Record<string, number>; // candidateId -> wins
  ballotsCast: number; // "5 / 7 voted" (count only, never who or for whom)
  voterTotal: number;
  result?: RoundResultView;
}

export interface RoundResultView {
  winnerId: string | 'tie';
  votes: Record<string, number>; // candidateId -> votes
  percents: Record<string, number>;
  loserPuckHeight: number; // loser_votes / winner_votes, 0..1
}

export interface ChatMessageView {
  id: string;
  fromId: string;
  text: string;
  sideTag?: Side; // candidates only
  at: number;
}

/** Only present from SECRET_REVEAL onwards. */
export interface SecretRevealView {
  roles: Record<string, RoleKey>;
  favourites: Record<string, string>; // biasedGuyId -> candidateId
  scores: Record<string, number>;
  awards?: { title: string; winnerId: string }[];
}

export interface RoomView {
  code: string;
  phase: Phase;
  settings: Settings;
  players: PublicPlayerView[];
  you: SelfView;
  round?: RoundView;
  chat: ChatMessageView[];
  mayorId?: string;
  /** Server epoch ms when the current phase ends. Clients render a countdown from this. */
  phaseEndsAt: number | null;
  serverNow: number; // lets clients correct clock skew
  paused: boolean; // candidate disconnect pause, etc.
  reveal?: SecretRevealView;
}
