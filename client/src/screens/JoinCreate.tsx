import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, ROOM_CODE_LENGTH } from '@mayor-race/shared';
import type { PromptTier } from '@mayor-race/shared';
import type { CreateSettings } from '../net/types';
import { Chalkboard, Pill, PillButton, Scene, Stepper, Toggle } from '../components/ui';

export type Mode = 'join' | 'create';

interface Props {
  mode: Mode;
  onMode: (m: Mode) => void;
  busy: boolean;
  error: string;
  initialCode?: string;
  onJoin: (code: string) => void;
  onCreate: (s: CreateSettings) => void;
}

const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '86px 1fr', alignItems: 'center', width: '100%', columnGap: 2 };

export function JoinCreate({ mode, onMode, busy, error, initialCode = '', onJoin, onCreate }: Props) {
  const [code, setCode] = useState(initialCode);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [tier, setTier] = useState<PromptTier>('silly');
  const [candidates, setCandidates] = useState<'random' | 'chosen'>('random');

  const ready = mode === 'create' || code.length === ROOM_CODE_LENGTH;
  const [hint, setHint] = useState('');
  const start = () => {
    if (busy) return;
    if (!ready) { setHint(`Enter the ${ROOM_CODE_LENGTH}-letter code`); return; }
    setHint('');
    if (mode === 'join') onJoin(code);
    else onCreate({ maxPlayers, promptTier: tier, candidateMode: candidates });
  };

  return (
    <Scene daisies={20} seed={3}>
      <Chalkboard contentStyle={mode === 'create' ? { inset: '19.5% 3% 24% 13%', alignItems: 'stretch', justifyContent: 'center', gap: 4 } : undefined}>
        {mode === 'join' ? (
          <>
            <div className="chalk-label" style={{ fontSize: 'clamp(14px,3.8vw,16px)' }}>Enter code</div>
            <input
              className="code-input"
              value={code}
              maxLength={ROOM_CODE_LENGTH}
              onChange={(e) => { setHint(''); setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '')); }}
              onKeyDown={(e) => e.key === 'Enter' && start()}
              aria-label="Room code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
            />
            <div className="error-text" role="alert">{error || hint}</div>
          </>
        ) : (
          <>
            <div style={row}>
              <span className="chalk-label">Players</span>
              <Stepper label="players" value={maxPlayers} min={MIN_PLAYERS} max={MAX_PLAYERS} onChange={setMaxPlayers} />
            </div>
            <div style={row}>
              <span className="chalk-label">Prompt</span>
              <div className="pill-group">
                <Pill selected={tier === 'silly'} onClick={() => setTier('silly')}>Silly</Pill>
                <Pill selected={tier === 'serious'} onClick={() => setTier('serious')}>Serious</Pill>
                <Pill selected={tier === 'random'} onClick={() => setTier('random')}>Random</Pill>
              </div>
            </div>
            <div style={row}>
              <span className="chalk-label">Candidates</span>
              <div className="pill-group">
                <Pill selected={candidates === 'random'} onClick={() => setCandidates('random')}>Random</Pill>
                <Pill selected={candidates === 'chosen'} onClick={() => setCandidates('chosen')}>Chosen</Pill>
              </div>
            </div>
            {error && <div className="error-text" role="alert">{error}</div>}
          </>
        )}
      </Chalkboard>

      <div className="layer" style={{ top: 'var(--horizon)' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '6%', display: 'flex', justifyContent: 'center' }}>
          <Toggle<Mode> value={mode} onChange={onMode} options={[{ value: 'join', label: 'Join' }, { value: 'create', label: 'Create' }]} />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '22.4%', display: 'flex', justifyContent: 'center' }}>
          <PillButton onClick={start} disabled={busy}>{busy ? '…' : 'Start'}</PillButton>
        </div>
      </div>
    </Scene>
  );
}
