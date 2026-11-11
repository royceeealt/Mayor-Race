// shared/src/mocks.ts
// Mock room states so the client can build every screen without a server (Build Plan, week 1).
import { DEFAULT_SETTINGS, AVATARS, type Phase } from './constants.js';
import type { PublicPlayerView, RoomView, Settings } from './types.js';

const NAMES = ['Priya', 'Sam', 'Mo', 'Jess', 'Arlo', 'Nia', 'Tom', 'Zed', 'Ivy', 'Raj', 'Lena', 'Bo'];

export function mockPlayers(count: number, opts: { candidates?: boolean } = {}): PublicPlayerView[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: NAMES[i % NAMES.length],
    avatar: AVATARS[i % AVATARS.length],
    connected: true,
    isHost: i === 0,
    ready: i % 2 === 0,
    isCandidate: !!opts.candidates && i < 2,
    candidateSlot: opts.candidates && i < 2 ? (i === 0 ? 'A' : 'B') : undefined,
    spectator: false,
  }));
}

export function mockRoomView(
  overrides: Partial<RoomView> & { playerCount?: number; youId?: string; phase?: Phase } = {},
): RoomView {
  const { playerCount = 5, youId = 'p1', ...rest } = overrides;
  const settings: Settings = { ...DEFAULT_SETTINGS, maxPlayers: 12, ...(rest.settings ?? {}) };
  return {
    code: 'ABCD',
    phase: 'LOBBY',
    settings,
    players: mockPlayers(playerCount),
    you: { playerId: youId, role: null, usesLeft: 0, hasVotedPrompt: false, hasCastBallot: false },
    chat: [],
    phaseEndsAt: null,
    serverNow: Date.now(),
    paused: false,
    ...rest,
  };
}
