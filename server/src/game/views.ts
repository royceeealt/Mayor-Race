
// The secrecy filter (CLAUDE.md 6.3).
// The ONLY place a RoomModel becomes something a client can see.
// Roles and favourites remain private until SECRET_REVEAL.
// Individual ballots and individual prompt votes are never exposed.

import {
  PHASES,
  type Phase,
  type RoomView,
  type PublicPlayerView,
  type SelfView,
  type RoundView,
  type PromptOptionView,
} from '@mayor-race/shared';

import type { RoomModel } from './roomModel.js';

const idx = (p: Phase) => PHASES.indexOf(p);

const ROLE_VISIBLE_FROM = idx('ROLE_REVEAL');
const SECRET_REVEAL_FROM = idx('SECRET_REVEAL');
const PROMPT_RESULT_FROM = idx('PROMPT_RESULT');
const SIDES_VISIBLE_FROM = idx('SIDES_REVEALED');

export function buildRoomView(
  model: RoomModel,
  viewerId: string,
  now: number,
): RoomView {
  const phaseIdx = idx(model.phase);
  const viewer = model.players.get(viewerId);
  const round = model.currentRound;

  // Public player information.
  const players: PublicPlayerView[] = [
    ...model.players.values(),
  ].map((p) => ({
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

  // Eligible prompt voters.
  const eligibleVoters = model.seated.filter(
    (p) => p.role !== 'candidate' && p.connected,
  );

  const eligibleBallotVoters = eligibleVoters;

  // Player-specific information.
  const rolesVisible =
    phaseIdx >= ROLE_VISIBLE_FROM &&
    model.phase !== 'NEXT_ELECTION';

  const you: SelfView = {
    playerId: viewerId,

    role:
      viewer && rolesVisible && !viewer.spectator
        ? viewer.role
        : null,

    usesLeft:
      viewer && rolesVisible
        ? viewer.usesLeft
        : 0,

    favourite:
      viewer &&
      rolesVisible &&
      viewer.role === 'biased'
        ? viewer.favourite
        : undefined,

    hasVotedPrompt:
      !!viewer &&
      !!round &&
      round.promptVotes[viewerId] !== undefined,

    hasCastBallot:
      !!viewer &&
      !!round &&
      round.ballots[viewerId] !== undefined,
  };

  // Build round information.
  let roundView: RoundView | undefined;

  if (round) {
    // Aggregate prompt votes without exposing voter identities.
    const promptCounts: Record<string, number> = {};

    for (const optionId of round.promptOptionIds) {
      promptCounts[optionId] = 0;
    }

    let totalPromptVotes = 0;

    for (const [voterId, promptId] of Object.entries(
      round.promptVotes,
    )) {
      if (
        eligibleVoters.some((p) => p.id === voterId) &&
        round.promptOptionIds.includes(promptId)
      ) {
        promptCounts[promptId]++;
        totalPromptVotes++;
      }
    }

    // Prompt cards are visible during voting and results.
    const showPromptOptions =
      model.phase === 'PROMPT_VOTE' ||
      phaseIdx >= PROMPT_RESULT_FROM;

    const promptOptions: PromptOptionView[] =
      showPromptOptions
        ? round.promptOptionIds.map((id) => ({
            id,
            text: id,
            votes:
              model.phase === 'PROMPT_VOTE' ||
              model.phase === 'PROMPT_RESULT'
                ? promptCounts[id] ?? 0
                : undefined,
          }))
        : [];

    // Winning prompt is revealed after voting.
    let winningPrompt: RoundView['winningPrompt'];

    if (
      phaseIdx >= PROMPT_RESULT_FROM &&
      round.promptId
    ) {
      const winningVotes = promptCounts[round.promptId] ?? 0;

      const percent =
        totalPromptVotes === 0
          ? 0
          : Math.round(
              (winningVotes / totalPromptVotes) * 100,
            );

      winningPrompt = {
        id: round.promptId,
        text: round.promptId,
        percent,
      };
    }

    // Candidate sides are revealed from SIDES_REVEALED onwards.
    const sides =
      phaseIdx >= SIDES_VISIBLE_FROM
        ? { ...round.sides }
        : undefined;

    // Only expose the current speaker during speech phases.
    const isSpeechPhase =
      model.phase === 'SPEECH_1' ||
      model.phase === 'SPEECH_2';

    const speakerId =
      isSpeechPhase
        ? model.speakerId ?? undefined
        : undefined;

    const speechPenaltySeconds =
      isSpeechPhase && model.speakerId
        ? model.speechPenaltySeconds
        : undefined;

    // Count ballots without exposing individual ballots.
    const ballotsCast = Object.keys(round.ballots).filter(
      (voterId) =>
        eligibleBallotVoters.some((p) => p.id === voterId),
    ).length;

    const roundWins = model.candidateIds
      ? Object.fromEntries(
          model.candidateIds.map((id) => [
            id,
            model.roundWins[id] ?? 0,
          ]),
        )
      : {};

    roundView = {
      index: round.index,
      totalRounds: model.totalRounds,

      promptOptions:
        showPromptOptions
          ? promptOptions
          : undefined,

      winningPrompt,

      sides,

      speakerId,

      speechPenaltySeconds,

      roundWins,

      ballotsCast,

      voterTotal: eligibleBallotVoters.length,
    };
  }

  // Main filtered room view.
  const view: RoomView = {
    code: model.code,
    phase: model.phase,
    settings: { ...model.settings },
    players,
    you,
    round: roundView,
    chat: [],

    mayorId:
      phaseIdx >= idx('MAYOR_ANNOUNCED')
        ? model.mayorId
        : undefined,

    phaseEndsAt: model.phaseEndsAt,
    serverNow: now,
    paused: false,
  };

  // Reveal secrets only during SECRET_REVEAL.
  if (
    phaseIdx >= SECRET_REVEAL_FROM &&
    model.phase !== 'NEXT_ELECTION'
  ) {
    const all = [...model.players.values()].filter(
      (p) => !p.spectator,
    );

    view.reveal = {
      roles: Object.fromEntries(
        all.map((p) => [p.id, p.role]),
      ),

      favourites: Object.fromEntries(
        all
          .filter((p) => p.favourite)
          .map((p) => [p.id, p.favourite as string]),
      ),

      scores: Object.fromEntries(
        all.map((p) => [p.id, p.score]),
      ),
    };
  }

  return view;
}
