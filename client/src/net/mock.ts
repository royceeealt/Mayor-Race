// Mock session: the whole lobby flow with no server (VITE_MOCK=1 or ?mock). Other "phones" trickle in every 1.5 s.
import { AVATARS, DEFAULT_SETTINGS, mockRoomView, type IntentName, type IntentPayload, type RoomView } from '@mayor-race/shared';
import type { CreateSettings, GameSession, Profile } from './types';

export function mockSession(profile: Profile, settings?: Partial<CreateSettings>, code = 'ABCD'): GameSession {
  const stateCbs: ((v: RoomView) => void)[] = [];
  let view = mockRoomView({ code, playerCount: 1, youId: 'p1', settings: { ...DEFAULT_SETTINGS, ...settings } as RoomView['settings'] });
  view.players[0] = { ...view.players[0], name: profile.name, avatar: profile.avatar };
  const emit = () => stateCbs.forEach((f) => f({ ...view, serverNow: Date.now() }));

  let n = 1;
  const timer = setInterval(() => {
    if (n >= 5) return clearInterval(timer);
    const extra = mockRoomView({ playerCount: n + 1 }).players[n];
    const avatar = AVATARS.find((a) => !view.players.some((p) => p.avatar === a)) ?? extra.avatar;
    view = { ...view, players: [...view.players, { ...extra, id: `p${n + 1}`, avatar, isHost: false }] };
    n++;
    emit();
  }, 1500);
  setTimeout(emit, 50);

  return {
    code,
    playerId: 'p1',
    send<K extends IntentName>(type: K, payload: IntentPayload<K>) {
      if (type === 'start_game') {
        view = { ...view, phase: 'ROLE_REVEAL', phaseEndsAt: Date.now() + 12_000 };
        emit();
      }
      void payload;
    },
    leave() { clearInterval(timer); },
    onState: (cb) => { stateCbs.push(cb); },
    onNotice: () => {},
    onTick: () => {},
    onClose: () => {},
  };
}
