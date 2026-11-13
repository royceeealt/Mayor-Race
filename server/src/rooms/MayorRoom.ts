
// The Colyseus room.
// Validate intent -> RoomModel -> machine -> filtered views.

import { Room, ServerError, matchMaker, type Client } from '@colyseus/core';

import {
  DEFAULT_SETTINGS,
  MIN_PLAYERS,
  intentSchemas,
  joinOptionsSchema,
  settingsSchema,
  type IntentName,
  type NoticeView,
  type Phase,
  type TimerTickView,
} from '@mayor-race/shared';

import {
  drawPromptOptions,
  tallyPrompt,
  allVoted,
  assignSides,
} from '../game/promptVote.js';

import { assignRoles } from '../game/assign.js';
import { matchCandidateName } from '../game/ballot.js';
import { createPhaseActor, type PhaseActor } from '../game/machine.js';
import { RoomError, RoomModel } from '../game/roomModel.js';
import { generateUniqueRoomCode } from '../game/roomCode.js';
import { buildRoomView } from '../game/views.js';

const KICKED_CODE = 4003;

const PROMPT_POOL = [
  'Pineapple belongs on pizza',
  'Peeing in the shower is acceptable',
  'Cats are better than dogs',
  'Breakfast is the best meal',
  'Money can buy happiness',
  'Summer is better than winter',
  'Video games are better than movies',
  'Socks should never be worn indoors',
  'Everyone should have a pet',
  'Mondays should be holidays',
];

export class MayorRoom extends Room {
  maxClients = 24;

  private model!: RoomModel;
  private actor!: PhaseActor;

  async onCreate(options: unknown) {
    const code = await generateUniqueRoomCode(async (c) => {
      try {
        return !!(await matchMaker.getRoomById(c));
      } catch {
        return false;
      }
    });

    this.roomId = code;
    this.setPrivate(true);

    const raw = (options as { settings?: unknown } | undefined)?.settings;
    const parsed = settingsSchema.partial().safeParse(raw ?? {});

    this.model = new RoomModel(
      code,
      parsed.success ? parsed.data : DEFAULT_SETTINGS,
    );

    this.actor = createPhaseActor();

    this.actor.subscribe((snap) => {
      const phase = snap.value as unknown as Phase;

      const changed =
        phase !== this.model.phase ||
        snap.context.phaseEndsAt !== this.model.phaseEndsAt;

      this.model.phase = phase;
      this.model.phaseEndsAt = snap.context.phaseEndsAt;

      if (changed) {
        // Initialize a fresh round.
        if (
          phase === 'ROUND_START' &&
          !this.model.currentRound
        ) {
          this.model.startRound();
        }

        // Draw prompts when voting begins.
        if (
          phase === 'PROMPT_VOTE' &&
          this.model.currentRound
        ) {
          const round = this.model.getCurrentRound();

          round.promptOptionIds = drawPromptOptions(
            PROMPT_POOL,
            this.model.usedPromptIds,
          );

          round.promptVotes = {};
        }

        // Finalize prompt voting.
        if (
          phase === 'PROMPT_RESULT' &&
          this.model.currentRound
        ) {
          this.finalizePromptVote();
        }

        // Randomly assign opposite sides to the candidates.
        if (
          phase === 'SIDES_REVEALED' &&
          this.model.currentRound &&
          this.model.candidateIds
        ) {
          const round = this.model.getCurrentRound();

          if (Object.keys(round.sides).length === 0) {
            round.sides = assignSides(
              this.model.candidateIds,
            );
          }
        }

        // Candidate A speaks first.
        if (
          phase === 'SPEECH_1' &&
          this.model.candidateIds
        ) {
          this.model.startSpeech(
            this.model.candidateIds[0],
          );
        }

        // Candidate B speaks second.
        if (
          phase === 'SPEECH_2' &&
          this.model.candidateIds
        ) {
          this.model.startSpeech(
            this.model.candidateIds[1],
          );
        }

        // Clear speech state when speeches end.
        if (phase === 'DEBATE_CHAT') {
          this.model.finishSpeech();
        }

        // A new ballot phase starts with no unconfirmed selections.
        // Pending selections are private and must never carry between ballots.
        if (phase === 'BALLOT') {
          this.model.clearPendingBallots();
        }

        // Clear speech state when the game leaves the round.
        if (
          phase === 'ROUND_RESULT' ||
          phase === 'MAYOR_ANNOUNCED' ||
          phase === 'LOBBY'
        ) {
          this.model.finishSpeech();
        }

        this.broadcastState();
      }
    });

    this.actor.start();

    for (const name of Object.keys(intentSchemas) as IntentName[]) {
      this.onMessage(name, (client, payload) =>
        this.handleIntent(client, name, payload),
      );
    }

    this.onMessage('*', () => {});

    this.clock.setInterval(() => this.tick(), 1000);
  }

  onAuth(_client: Client, options: unknown) {
    const parsed = joinOptionsSchema.safeParse(options);

    if (!parsed.success) {
      throw new ServerError(4002, 'INVALID_OPTIONS');
    }

    if (this.model?.isFull) {
      throw new ServerError(4001, 'ROOM_FULL');
    }

    return true;
  }

  onJoin(client: Client, options: unknown) {
    const { name, avatar } = joinOptionsSchema.parse(options);

    try {
      this.model.join(client.sessionId, { name, avatar });
    } catch (e) {
      if (e instanceof RoomError) {
        throw new ServerError(4001, e.code);
      }

      throw e;
    }

    this.broadcastState();
  }

  onLeave(client: Client) {
    this.removePlayer(client.sessionId, 'player_left');
  }

  onDispose() {
    this.actor?.stop();
  }

  // --------------------------------------------------
  // INTENTS
  // --------------------------------------------------

  private handleIntent(
    client: Client,
    name: IntentName,
    payload: unknown,
  ) {
    const parsed = intentSchemas[name].safeParse(payload ?? {});

    if (!parsed.success) return;

    const data = parsed.data as any;
    const id = client.sessionId;
    const m = this.model;

    switch (name) {
      case 'ready':
        m.setReady(id, data.ready);
        break;

      case 'set_name':
        m.setName(id, data.name);
        break;

      case 'set_avatar':
        m.setAvatar(id, data.avatar);
        break;

      case 'leave':
        client.leave();
        return;

      case 'change_settings':
        m.changeSettings(id, data);
        break;

      case 'kick': {
        const removed = m.kick(id, data.playerId);

        if (removed) {
          const target = this.clients.getById(removed);

          this.sendNotice(target, {
            kind: 'kicked',
            playerId: removed,
          });

          target?.leave(KICKED_CODE);
        }

        break;
      }

      // --------------------------------
      // PROMPT VOTING
      // --------------------------------

      case 'vote_prompt': {
        if (m.phase !== 'PROMPT_VOTE') return;

        const round = m.currentRound;
        const player = m.players.get(id);

        if (!round || !player) return;

        if (
          player.role === 'candidate' ||
          player.spectator ||
          !player.connected
        ) {
          return;
        }

        if (round.promptVotes[id] !== undefined) return;

        if (!round.promptOptionIds.includes(data.promptId)) return;

        round.promptVotes[id] = data.promptId;

        const eligible = m.seated
          .filter(
            (p) =>
              p.role !== 'candidate' &&
              p.connected,
          )
          .map((p) => p.id);

        if (allVoted(round.promptVotes, eligible)) {
          this.actor.send({
            type: 'PROMPT_VOTING_COMPLETE',
          });

          return;
        }

        this.broadcastState();
        return;
      }

      // --------------------------------
      // BALLOT: MATCH A NAME TO A CANDIDATE
      // --------------------------------

      case 'cast_ballot': {
        if (!m.isEligibleBallotVoter(id)) return;

        const round = m.currentRound;
        const candidateIds = m.candidateIds;

        if (!round || !candidateIds) return;

        if (round.ballots[id] !== undefined) {
          client.send('ballot_status', { status: 'already_voted' });
          return;
        }

        const candidates = candidateIds.map((candidateId) => {
          const player = m.players.get(candidateId);
          return player ? { id: player.id, name: player.name } : null;
        });

        if (candidates.some((candidate) => candidate === null)) return;

        const result = matchCandidateName(
          data.name,
          candidates as { id: string; name: string }[],
        );

        if (result.status !== 'matched') {
          client.send('ballot_match', { status: result.status });
          return;
        }

        if (!m.setPendingBallot(id, result.candidate.id)) return;

        // Only the voter receives the matched candidate's identity.
        client.send('ballot_match', {
          status: 'matched',
          candidateId: result.candidate.id,
          candidateName: result.candidate.name,
        });
        return;
      }

      // --------------------------------
      // BALLOT: CONFIRM THE MATCHED CANDIDATE
      // --------------------------------

      case 'confirm_ballot': {
        if (!m.isEligibleBallotVoter(id)) return;

        const pendingCandidateId = m.getPendingBallot(id);

        // Confirmation must match the candidate shown to this voter.
        if (!pendingCandidateId || pendingCandidateId !== data.candidateId) {
          client.send('ballot_status', { status: 'invalid_confirmation' });
          return;
        }

        const recorded = m.recordBallot(id, data.candidateId);

        if (!recorded) {
          client.send('ballot_status', { status: 'rejected' });
          return;
        }

        client.send('ballot_status', { status: 'recorded' });
        this.broadcastState();
        return;
      }

      // --------------------------------
      // SPEECH MANAGEMENT
      // --------------------------------

      case 'finish_speech': {
        if (
          m.phase !== 'SPEECH_1' &&
          m.phase !== 'SPEECH_2'
        ) {
          return;
        }

        const player = m.players.get(id);

        if (!player || player.spectator || !player.connected) {
          return;
        }

        // Only the active candidate can finish their own speech.
        if (
          player.role !== 'candidate' ||
          m.speakerId !== id
        ) {
          return;
        }

        this.actor.send({
          type: 'FINISH_SPEECH',
        });

        return;
      }

      // --------------------------------
      // GAME START
      // --------------------------------

      case 'start_game': {
        if (!m.canStart(id)) return;

        m.prepareStart();

        const candidateIds = assignRoles(
          [...m.players.values()],
          {
            candidateMode: m.settings.candidateMode,
            rolesEnabled: m.settings.rolesEnabled,
          },
        );

        m.startGame(candidateIds);

        this.actor.send({
          type: 'START',
          totalRounds: m.settings.rounds,
          speechSeconds: m.settings.speechSeconds,
        });

        return;
      }

      case 'skip_phase':
        if (m.players.get(id)?.isHost) {
          this.actor.send({ type: 'SKIP' });
        }
        return;

      case 'rematch':
        if (
          m.phase === 'NEXT_ELECTION' &&
          m.players.get(id)?.isHost
        ) {
          this.actor.send({ type: 'REMATCH' });
          m.resetToLobby();
        }
        break;

      default:
        return;
    }

    this.broadcastState();
  }

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  private finalizePromptVote() {
    const round = this.model.currentRound;

    if (!round || round.promptId) return;

    const eligible = this.model.seated
      .filter(
        (p) =>
          p.role !== 'candidate' &&
          p.connected,
      )
      .map((p) => p.id);

    const result = tallyPrompt(
      round.promptOptionIds,
      round.promptVotes,
      eligible,
    );

    round.promptId = result.winnerId;

    if (!this.model.usedPromptIds.includes(result.winnerId)) {
      this.model.usedPromptIds.push(result.winnerId);
    }

    console.log('Prompt voting completed:', {
      winner: result.winnerId,
      counts: result.counts,
      totalVotes: result.totalVotes,
      percentage: result.percent,
    });
  }

  private removePlayer(
    id: string,
    kind: NoticeView['kind'],
  ) {
    const res = this.model.leave(id);

    if (!res.name) return;

    this.broadcastNotice({
      kind,
      playerId: id,
      name: res.name,
    });

    if (res.newHostId) {
      this.broadcastNotice({
        kind: 'host_changed',
        playerId: res.newHostId,
      });
    }

    if (
      !this.model.inLobby &&
      this.model.connectedSeatedCount < MIN_PLAYERS
    ) {
      this.broadcastNotice({ kind: 'game_aborted' });

      this.actor.send({ type: 'ABORT' });

      this.model.resetToLobby();
    }

    this.broadcastState();
  }

  private broadcastState() {
    const now = Date.now();

    for (const c of this.clients) {
      c.send(
        'state_changed',
        buildRoomView(this.model, c.sessionId, now),
      );
    }
  }

  private broadcastNotice(n: NoticeView) {
    this.broadcast('notice', n);
  }

  private sendNotice(
    c: Client | undefined,
    n: NoticeView,
  ) {
    c?.send('notice', n);
  }

  private tick() {
    const endsAt = this.model.phaseEndsAt;

    if (endsAt === null) return;

    const payload: TimerTickView = {
      phase: this.model.phase,
      endsAt,
      serverNow: Date.now(),
    };

    this.broadcast('timer_tick', payload);
  }
}
