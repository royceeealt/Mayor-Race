import { useMemo, useState } from 'react';
import { MIN_PLAYERS, formatRoomCode, type Avatar, type RoomView } from '@mayor-race/shared';
import { Character, Chalkboard, Pill, PillButton, Scene } from '../components/ui';

interface Props {
  view: RoomView;
  onStart: () => void;
}

/** Where each player stands on the meadow, as [x%, feet y%] of the screen. First five are the spots in design/lobby.png. */
function slotsFor(n: number): [number, number][] {
  if (n <= 5) return ([[18, 95], [35, 86.5], [55, 94], [74, 85.5], [89, 94.5]] as [number, number][]).slice(0, n);
  const c0 = Math.ceil(n / 3);
  const c1 = Math.ceil((n - c0) / 2);
  const counts = [c0, c1, n - c0 - c1];
  const ys = [83.5, 89.5, 95.5];
  return counts.flatMap((c, r) => Array.from({ length: c }, (_, j) => [((j + 0.5) / c) * 100 * 0.9 + 5 + (r === 1 ? 0 : 0), ys[r]] as [number, number]));
}

export function Lobby({ view, onStart }: Props) {
  const [copied, setCopied] = useState(false);
  const seated = view.players.filter((p) => !p.spectator);
  const me = view.players.find((p) => p.id === view.you.playerId);
  const isHost = !!me?.isHost;
  const canStart = isHost && seated.length >= MIN_PLAYERS;
  const slots = useMemo(() => slotsFor(seated.length), [seated.length]);
  const h = seated.length <= 5 ? 15 : seated.length <= 8 ? 12.5 : 10.5; // dvh at the front row
  const perspective = (y: number) => Math.min(1, Math.max(0.86, 0.86 + (y - 84) * 0.016)); // farther back = smaller

  const copy = async () => {
    const link = `${location.origin}/?code=${view.code}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Copy this link', link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Scene daisies={22} seed={9}>
      <div className="roomcode" aria-label={`Room code ${view.code.split('').join(' ')}`}>Room code : {formatRoomCode(view.code)}</div>

      <Chalkboard contentStyle={{ inset: '24% 3% 14% 3%' }}>
        <div className={`lobby-chips${seated.length > 8 ? ' lobby-chips--dense' : ''}`} style={{ padding: seated.length <= 6 ? '0 17%' : '0 3%' }}>
          {seated.map((p) => (
            <Pill key={p.id} host={p.isHost}>{p.name}</Pill>
          ))}
        </div>
      </Chalkboard>

      <div className="layer">
        <button type="button" className="lobby-count" onClick={copy} aria-label="Copy invite link">
          <span className="lobby-count__n">{seated.length} / {view.settings.maxPlayers}</span>
          <span>{copied ? 'Copied!' : 'Copy link'}</span>
        </button>
        {isHost ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(var(--horizon) + 8.3%)', display: 'flex', justifyContent: 'center' }}>
            <PillButton onClick={onStart} disabled={!canStart} style={{ minHeight: 44, fontSize: 16, minWidth: 110, padding: '0 24px' }}>Start</PillButton>
          </div>
        ) : null}
        <div className="lobby-wait" aria-live="polite" style={isHost ? { top: 'calc(var(--horizon) + 15%)', display: canStart ? 'none' : 'block' } : undefined}>
          {seated.length < MIN_PLAYERS ? `need at least ${MIN_PLAYERS} players …` : seated.length < view.settings.maxPlayers ? 'waiting for more …' : 'the room is full'}
        </div>

        {seated.map((p, k) => (
          <Character
            key={p.id}
            avatar={p.avatar as Avatar}
            height={`${(h * perspective(slots[k][1])).toFixed(2)}dvh`}
            x={`${slots[k][0]}%`}
            y={`${slots[k][1]}%`}
            name={p.id === view.you.playerId ? `${p.name} (you)` : p.name}
            pop
            style={{ maxHeight: h * 8.2 * perspective(slots[k][1]), zIndex: Math.round(slots[k][1]) }}
          />
        ))}
      </div>
    </Scene>
  );
}
