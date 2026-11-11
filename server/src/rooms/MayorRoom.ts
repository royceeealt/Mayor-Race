// The Colyseus room. Thin on purpose: validate intent -> RoomModel -> machine -> filtered views to each client.
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
import { createPhaseActor, type PhaseActor } from '../game/machine.js';
import { RoomError, RoomModel } from '../game/roomModel.js';
import { generateUniqueRoomCode } from '../game/roomCode.js';
import { buildRoomView } from '../game/views.js';

const KICKED_CODE = 4003;

export class MayorRoom extends Room {
  // 12 seats + spectators. The real seat cap is settings.maxPlayers, enforced in onAuth.
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
    this.setPrivate(true); // reachable by code only, never listed

    const raw = (options as { settings?: unknown } | undefined)?.settings;
    const parsed = settingsSchema.partial().safeParse(raw ?? {});
    this.model = new RoomModel(code, parsed.success ? parsed.data : DEFAULT_SETTINGS);

    this.actor = createPhaseActor();
    this.actor.subscribe((snap) => {
      const phase = snap.value as unknown as Phase;
      const changed = phase !== this.model.phase || snap.context.phaseEndsAt !== this.model.phaseEndsAt;
      this.model.phase = phase;
      this.model.phaseEndsAt = snap.context.phaseEndsAt;
      if (changed) this.broadcastState();
    });
    this.actor.start();

    for (const name of Object.keys(intentSchemas) as IntentName[]) {
      this.onMessage(name, (client, payload) => this.handleIntent(client, name, payload));
    }
    this.onMessage('*', () => {}); // unknown messages are ignored silently

    this.clock.setInterval(() => this.tick(), 1000);
  }

  onAuth(_client: Client, options: unknown) {
    const parsed = joinOptionsSchema.safeParse(options);
    if (!parsed.success) throw new ServerError(4002, 'INVALID_OPTIONS');
    if (this.model?.isFull) throw new ServerError(4001, 'ROOM_FULL');
    return true;
  }

  onJoin(client: Client, options: unknown) {
    const { name, avatar } = joinOptionsSchema.parse(options);
    try {
      this.model.join(client.sessionId, { name, avatar });
    } catch (e) {
      if (e instanceof RoomError) throw new ServerError(4001, e.code);
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

  // ------------------------------------------------------------------ intents

  private handleIntent(client: Client, name: IntentName, payload: unknown) {
    const parsed = intentSchemas[name].safeParse(payload ?? {});
    if (!parsed.success) return; // invalid input is dropped silently
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
          this.sendNotice(target, { kind: 'kicked', playerId: removed });
          target?.leave(KICKED_CODE);
        }
        break;
      }
      case 'start_game':
        if (!m.canStart(id)) return;
        m.prepareStart();
        this.actor.send({ type: 'START', totalRounds: m.settings.rounds, speechSeconds: m.settings.speechSeconds });
        return; // machine subscription broadcasts
      case 'skip_phase':
        if (m.players.get(id)?.isHost) this.actor.send({ type: 'SKIP' });
        return;
      case 'rematch':
        if (m.phase === 'NEXT_ELECTION' && m.players.get(id)?.isHost) {
          this.actor.send({ type: 'REMATCH' });
          m.resetToLobby();
        }
        break;
      default:
        // Round intents (vote_prompt, boo, cast_ballot, chat ...) arrive in weeks 2 and 3. Rejected silently.
        return;
    }
    this.broadcastState();
  }

  // ------------------------------------------------------------------ helpers

  private removePlayer(id: string, kind: NoticeView['kind']) {
    const res = this.model.leave(id);
    if (!res.name) return;
    this.broadcastNotice({ kind, playerId: id, name: res.name });
    if (res.newHostId) this.broadcastNotice({ kind: 'host_changed', playerId: res.newHostId });

    // Fewer than 3 players remain: end the game with a message (section 2.6).
    if (!this.model.inLobby && this.model.connectedSeatedCount < MIN_PLAYERS) {
      this.broadcastNotice({ kind: 'game_aborted' });
      this.actor.send({ type: 'ABORT' });
      this.model.resetToLobby();
    }
    this.broadcastState();
  }

  private broadcastState() {
    const now = Date.now();
    for (const c of this.clients) c.send('state_changed', buildRoomView(this.model, c.sessionId, now));
  }

  private broadcastNotice(n: NoticeView) {
    this.broadcast('notice', n);
  }

  private sendNotice(c: Client | undefined, n: NoticeView) {
    c?.send('notice', n);
  }

  private tick() {
    const endsAt = this.model.phaseEndsAt;
    if (endsAt === null) return;
    const payload: TimerTickView = { phase: this.model.phase, endsAt, serverNow: Date.now() };
    this.broadcast('timer_tick', payload);
  }
}
