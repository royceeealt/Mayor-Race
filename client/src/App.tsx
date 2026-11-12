import { useCallback, useEffect, useRef, useState } from 'react';
import { AVATARS, type Avatar, type NoticeView, type RoomView, type TimerTickView } from '@mayor-race/shared';
import { createRoom, joinRoom } from './net/colyseus';
import { mockSession } from './net/mock';
import { SessionError, type CreateSettings, type GameSession } from './net/types';
import { Overlay, PillButton } from './components/ui';
import { Home } from './screens/Home';
import { HowToPlay } from './screens/HowToPlay';
import { JoinCreate, type Mode } from './screens/JoinCreate';
import { Lobby } from './screens/Lobby';
import { Playing } from './screens/Playing';

type Screen = 'home' | 'howto' | 'joincreate' | 'lobby';

const params = new URLSearchParams(location.search);
const MOCK = params.has('mock') || import.meta.env.VITE_MOCK === '1';
const codeFromLink = (params.get('code') ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);

const ERROR_TEXT: Record<string, string> = {
  ROOM_NOT_FOUND: 'Room not found. Check the code?',
  ROOM_FULL: 'That room is full.',
  INVALID_OPTIONS: 'Pick a name first.',
  NETWORK: 'Can’t reach the town server.',
};

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export default function App() {
  const [screen, setScreen] = useState<Screen>((params.get('screen') as Screen) || 'home');
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'create' ? 'create' : 'join');
  const [name, setName] = useState(() => store.get('mr:name') ?? `Guest ${Math.floor(10 + Math.random() * 90)}`);
  const [avatar, setAvatar] = useState<Avatar>(() => {
    const saved = store.get('mr:avatar') as Avatar | null;
    return saved && AVATARS.includes(saved) ? saved : AVATARS[Math.floor(Math.random() * AVATARS.length)];
  });
  const [session, setSession] = useState<GameSession | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [skew, setSkew] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [dropped, setDropped] = useState<null | 'kicked' | 'lost'>(null);
  const viewRef = useRef<RoomView | null>(null);

  useEffect(() => { store.set('mr:name', name); }, [name]);
  useEffect(() => { store.set('mr:avatar', avatar); }, [avatar]);

  const say = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const attach = useCallback((s: GameSession) => {
    setSession(s);
    s.onState((v) => {
      viewRef.current = v;
      setView(v);
      setSkew(v.serverNow - Date.now());
      setScreen('lobby');
    });
    s.onTick((t: TimerTickView) => setSkew(t.serverNow - Date.now()));
    s.onNotice((n: NoticeView) => {
      const nameOf = (id?: string) => viewRef.current?.players.find((p) => p.id === id)?.name ?? n.name ?? 'Someone';
      if (n.kind === 'player_left') say(`${n.name ?? 'A player'} left`);
      if (n.kind === 'host_changed') say(`${nameOf(n.playerId)} is now the host`);
      if (n.kind === 'game_aborted') say('Not enough players. Back to the lobby.');
    });
    s.onClose((reason) => {
      setSession(null); setView(null); viewRef.current = null;
      if (reason === 'left') setScreen('home');
      else setDropped(reason);
    });
  }, [say]);

  const profile = () => ({ name: name.trim() || 'Guest', avatar });

  const doJoin = async (code: string) => {
    setBusy(true); setError('');
    try {
      attach(MOCK ? mockSession(profile(), undefined, code) : await joinRoom(code, profile()));
    } catch (e) {
      setError(ERROR_TEXT[(e as SessionError).kind] ?? ERROR_TEXT.NETWORK);
    } finally { setBusy(false); }
  };

  const doCreate = async (s: CreateSettings) => {
    setBusy(true); setError('');
    try {
      attach(MOCK ? mockSession(profile(), s) : await createRoom(profile(), s));
    } catch (e) {
      setError(ERROR_TEXT[(e as SessionError).kind] ?? ERROR_TEXT.NETWORK);
    } finally { setBusy(false); }
  };

  const me = view?.players.find((p) => p.id === view.you.playerId);

  return (
    <div className="app">
      {screen === 'home' && (
        <Home avatar={avatar} name={name} onAvatar={setAvatar} onName={setName} onHowTo={() => setScreen('howto')} onPlay={() => { setError(''); setScreen('joincreate'); }} />
      )}
      {screen === 'howto' && <HowToPlay onBack={() => setScreen('home')} onStart={() => { setError(''); setScreen('joincreate'); }} />}
      {screen === 'joincreate' && (
        <JoinCreate mode={mode} onMode={(m) => { setError(''); setMode(m); }} busy={busy} error={error} initialCode={codeFromLink} onJoin={doJoin} onCreate={doCreate} />
      )}
      {screen === 'lobby' && view && session && (
        view.phase === 'LOBBY' ? (
          <Lobby view={view} onStart={() => session.send('start_game', {})} />
        ) : (
          <Playing view={view} skew={skew} canSkip={!!me?.isHost} onSkip={() => session.send('skip_phase', {})} />
        )
      )}

      {toast && <div key={toast.id} className="toast" role="status">{toast.text}</div>}

      {dropped && (
        <Overlay
          title={dropped === 'kicked' ? 'You were removed' : 'Connection lost'}
          action={<PillButton onClick={() => { setDropped(null); setScreen('home'); }}>Back to town</PillButton>}
        >
          {dropped === 'kicked' ? 'The host removed you from the room.' : 'We lost the connection to the room.'}
        </Overlay>
      )}
    </div>
  );
}

