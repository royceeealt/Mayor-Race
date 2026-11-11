// The secrecy filter (CLAUDE.md 6.3). The ONLY place a RoomModel becomes something a client can see.
// Rules: roles are private to their owner until SECRET_REVEAL; favourites likewise; ballots never leave the server.
import { PHASES, type Phase, type RoomView, type PublicPlayerView, type SelfView } from '@mayor-race/shared';
import type { RoomModel } from './roomModel.js';

const idx = (p: Phase) => PHASES.indexOf(p);
const ROLE_VISIBLE_FROM = idx('ROLE_REVEAL');
const SECRET_REVEAL_FROM = idx('SECRET_REVEAL');

export function buildRoomView(model: RoomModel, viewerId: string, now: number): RoomView {
  const phaseIdx = idx(model.phase);
  const viewer = model.players.get(viewerId);

  const players: PublicPlayerView[] = [...model.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    connected: p.connected,
    isHost: p.isHost,
    ready: p.ready,
    isCandidate: p.role === 'candidate',
    candidateSlot: p.candidateSlot,
    spectator: p.spectator,
  }));

  const rolesVisible = phaseIdx >= ROLE_VISIBLE_FROM && model.phase !== 'NEXT_ELECTION';
  const you: SelfView = {
    playerId: viewerId,
    role: viewer && rolesVisible && !viewer.spectator ? viewer.role : null,
    usesLeft: viewer && rolesVisible ? viewer.usesLeft : 0,
    favourite: viewer && rolesVisible && viewer.role === 'biased' ? viewer.favourite : undefined,
    hasVotedPrompt: false, // week 2
    hasCastBallot: false, // week 2
  };

  const view: RoomView = {
    code: model.code,
    phase: model.phase,
    settings: { ...model.settings },
    players,
    you,
    chat: [],
    mayorId: phaseIdx >= idx('MAYOR_ANNOUNCED') ? model.mayorId : undefined,
    phaseEndsAt: model.phaseEndsAt,
    serverNow: now,
    paused: false,
  };

  if (phaseIdx >= SECRET_REVEAL_FROM && model.phase !== 'NEXT_ELECTION') {
    const all = [...model.players.values()].filter((p) => !p.spectator);
    view.reveal = {
      roles: Object.fromEntries(all.map((p) => [p.id, p.role])),
      favourites: Object.fromEntries(all.filter((p) => p.favourite).map((p) => [p.id, p.favourite as string])),
      scores: Object.fromEntries(all.map((p) => [p.id, p.score])),
    };
  }
  return view;
}
