import { Client, type Room } from '@colyseus/sdk';
import { ROOM_NAME, type IntentName, type IntentPayload, type NoticeView, type RoomView, type TimerTickView } from '@mayor-race/shared';
import { SessionError, type CreateSettings, type GameSession, type Profile } from './types';

const SERVER_URL: string = import.meta.env.VITE_SERVER_URL ?? `ws://${location.hostname}:2567`;
const client = new Client(SERVER_URL);

function mapError(e: unknown): SessionError {
  const err = e as { code?: number; message?: string };
  const msg = err?.message ?? '';
  if (msg.includes('ROOM_FULL')) return new SessionError('ROOM_FULL');
  if (msg.includes('INVALID_OPTIONS')) return new SessionError('INVALID_OPTIONS');
  if (err?.code === 522 || /not found/i.test(msg)) return new SessionError('ROOM_NOT_FOUND');
  return new SessionError('NETWORK');
}

class ColyseusSession implements GameSession {
  private stateCbs: ((v: RoomView) => void)[] = [];
  private noticeCbs: ((n: NoticeView) => void)[] = [];
  private tickCbs: ((t: TimerTickView) => void)[] = [];
  private closeCbs: ((r: 'left' | 'kicked' | 'lost') => void)[] = [];
  private kicked = false;
  private leftOnPurpose = false;

  constructor(private room: Room) {
    room.onMessage('state_changed', (v: RoomView) => this.stateCbs.forEach((f) => f(v)));
    room.onMessage('notice', (n: NoticeView) => {
      if (n.kind === 'kicked' && n.playerId === room.sessionId) this.kicked = true;
      this.noticeCbs.forEach((f) => f(n));
    });
    room.onMessage('timer_tick', (t: TimerTickView) => this.tickCbs.forEach((f) => f(t)));
    room.onLeave(() => {
      const reason = this.leftOnPurpose ? 'left' : this.kicked ? 'kicked' : 'lost';
      this.closeCbs.forEach((f) => f(reason));
    });
  }
  get code() { return this.room.roomId; }
  get playerId() { return this.room.sessionId; }
  send<K extends IntentName>(type: K, payload: IntentPayload<K>) { this.room.send(type, payload); }
  leave() { this.leftOnPurpose = true; void this.room.leave(); }
  onState(cb: (v: RoomView) => void) { this.stateCbs.push(cb); }
  onNotice(cb: (n: NoticeView) => void) { this.noticeCbs.push(cb); }
  onTick(cb: (t: TimerTickView) => void) { this.tickCbs.push(cb); }
  onClose(cb: (r: 'left' | 'kicked' | 'lost') => void) { this.closeCbs.push(cb); }
}

export async function createRoom(profile: Profile, settings: CreateSettings): Promise<GameSession> {
  try {
    return new ColyseusSession(await client.create(ROOM_NAME, { ...profile, settings }));
  } catch (e) {
    throw mapError(e);
  }
}

export async function joinRoom(code: string, profile: Profile): Promise<GameSession> {
  try {
    return new ColyseusSession(await client.joinById(code.trim().toUpperCase(), profile));
  } catch (e) {
    throw mapError(e);
  }
}
