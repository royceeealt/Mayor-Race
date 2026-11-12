import type { Avatar, IntentName, IntentPayload, JoinError, NoticeView, RoomView, Settings, TimerTickView } from '@mayor-race/shared';

/** What the UI talks to. Implemented by the real Colyseus session and by the mock session. */
export interface GameSession {
  readonly code: string;
  readonly playerId: string;
  send<K extends IntentName>(type: K, payload: IntentPayload<K>): void;
  leave(): void;
  onState(cb: (v: RoomView) => void): void;
  onNotice(cb: (n: NoticeView) => void): void;
  onTick(cb: (t: TimerTickView) => void): void;
  onClose(cb: (reason: 'left' | 'kicked' | 'lost') => void): void;
}

export interface Profile {
  name: string;
  avatar: Avatar;
}

export type CreateSettings = Pick<Settings, 'maxPlayers' | 'promptTier' | 'candidateMode'>;

export class SessionError extends Error {
  constructor(public kind: JoinError | 'NETWORK') {
    super(kind);
  }
}
