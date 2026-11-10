// shared/mocks.ts
// Typed fake room states so the client can build every screen without the server.
// Usage: import { mockLobby, mockSpeech } from '@mayor-race/shared';
// Times are relative to the moment the file loads, so countdowns tick down from a fresh value.

import type {
  ChatMessageView,
  PublicPlayerView,
  RoomView,
  RoundView,
  SelfView,
  Settings,
} from './types';

const NOW = Date.now();

const settings: Settings = {
  rounds: 3,
  speechSeconds: 45,
  promptTier: 'silly',
  candidateMode: 'random',
  rolesEnabled: true,
  casualMode: false,
  maxPlayers: 12,
};

// p1 is the host. p2 (red, A) and p3 (blue, B) are candidates once the game starts.
const names: [string, PublicPlayerView['avatar']][] = [
  ['Priya', 'frog'],
  ['Sam', 'cat'],
  ['Mo', 'shark'],
  ['Jade', 'pigeon'],
  ['Ollie', 'crab'],
  ['Wren', 'ladybug'],
  ['Tess', 'duck'],
];

function makePlayers(count: number, withCandidates: boolean): PublicPlayerView[] {
  return names.slice(0, count).map(([name, avatar], i) => ({
    id: `p${i + 1}`,
    name,
    avatar,
    connected: true,
    isHost: i === 0,
    ready: i % 2 === 0,
    isCandidate: withCandidates && (i === 1 || i === 2),
    candidateSlot: withCandidates ? (i === 1 ? 'A' : i === 2 ? 'B' : undefined) : undefined,
    spectator: false,
  }));
}

const hostSelf: SelfView = {
  playerId: 'p1',
  role: null,
  usesLeft: 0,
  hasVotedPrompt: false,
  hasCastBallot: false,
};

// You are p5 (Ollie), the Booing Guy, in all in-game mocks.
const booingSelf: SelfView = {
  playerId: 'p5',
  role: 'booing',
  usesLeft: 3,
  hasVotedPrompt: true,
  hasCastBallot: false,
};

const baseRound: RoundView = {
  index: 0,
  totalRounds: 3,
  roundWins: { p2: 0, p3: 0 },
  ballotsCast: 0,
  voterTotal: 5,
};

const room = (over: Partial<RoomView>): RoomView => ({
  code: 'KQWM',
  phase: 'LOBBY',
  settings,
  players: makePlayers(7, true),
  you: booingSelf,
  chat: [],
  phaseEndsAt: null,
  serverNow: NOW,
  paused: false,
  ...over,
});

/** Lobby: 5 players, you are the host, nobody is a candidate yet. */
export const mockLobby: RoomView = room({
  phase: 'LOBBY',
  players: makePlayers(5, false),
  you: hostSelf,
});

/** Prompt vote: 3 hot takes with live counts. */
export const mockPromptVote: RoomView = room({
  phase: 'PROMPT_VOTE',
  phaseEndsAt: NOW + 15_000,
  round: {
    ...baseRound,
    promptOptions: [
      { id: 'pr1', text: 'Peeing in the shower is bad.', votes: 2 },
      { id: 'pr2', text: 'A hot dog is a sandwich.', votes: 1 },
      { id: 'pr3', text: 'Ducks are just wet chickens.', votes: 1 },
    ],
  },
  you: { ...booingSelf, hasVotedPrompt: false },
});

/** Speech: candidate A is speaking, you are the Booing Guy with 3 tomatoes. */
export const mockSpeech: RoomView = room({
  phase: 'SPEECH_1',
  phaseEndsAt: NOW + 45_000,
  round: {
    ...baseRound,
    winningPrompt: { id: 'pr2', text: 'A hot dog is a sandwich.', percent: 57 },
    sides: { p2: 'agree', p3: 'disagree' },
    speakerId: 'p2',
    speechPenaltySeconds: 5,
  },
});

const chat: ChatMessageView[] = [
  { id: 'm1', fromId: 'p2', text: 'Bread. Meat. Done.', sideTag: 'agree', at: NOW - 40_000 },
  { id: 'm2', fromId: 'p4', text: 'so a taco is a sandwich??', at: NOW - 30_000 },
  { id: 'm3', fromId: 'p3', text: 'A taco is a taco. Stay in your lane.', sideTag: 'disagree', at: NOW - 20_000 },
  { id: 'm4', fromId: 'p6', text: 'this is the best town meeting ever', at: NOW - 10_000 },
];

/** Debate chat wall with candidate side tags. */
export const mockDebate: RoomView = room({
  phase: 'DEBATE_CHAT',
  phaseEndsAt: NOW + 60_000,
  round: {
    ...baseRound,
    winningPrompt: { id: 'pr2', text: 'A hot dog is a sandwich.', percent: 57 },
    sides: { p2: 'agree', p3: 'disagree' },
  },
  chat,
});

/** Ballot: 3 of 5 voters have voted, you have not. Never shows who voted for whom. */
export const mockBallot: RoomView = room({
  phase: 'BALLOT',
  phaseEndsAt: NOW + 20_000,
  round: {
    ...baseRound,
    winningPrompt: { id: 'pr2', text: 'A hot dog is a sandwich.', percent: 57 },
    sides: { p2: 'agree', p3: 'disagree' },
    ballotsCast: 3,
  },
  chat,
});

/** Round result: candidate A wins 4 votes to 1 on the high striker. */
export const mockRoundResult: RoomView = room({
  phase: 'ROUND_RESULT',
  phaseEndsAt: NOW + 10_000,
  round: {
    ...baseRound,
    winningPrompt: { id: 'pr2', text: 'A hot dog is a sandwich.', percent: 57 },
    sides: { p2: 'agree', p3: 'disagree' },
    ballotsCast: 5,
    roundWins: { p2: 1, p3: 0 },
    result: {
      winnerId: 'p2',
      votes: { p2: 4, p3: 1 },
      percents: { p2: 80, p3: 20 },
      loserPuckHeight: 0.25, // loser_votes / winner_votes
    },
  },
  you: { ...booingSelf, hasCastBallot: true },
});

export const allMocks = {
  lobby: mockLobby,
  promptVote: mockPromptVote,
  speech: mockSpeech,
  debate: mockDebate,
  ballot: mockBallot,
  roundResult: mockRoundResult,
};
