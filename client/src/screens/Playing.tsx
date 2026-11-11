import { useEffect, useState } from 'react';
import type { RoomView } from '@mayor-race/shared';
import { Scene } from '../components/ui';

const LABELS: Record<string, string> = {
  ASSIGN_ROLES: 'Assigning roles', ROLE_REVEAL: 'Role reveal', ROUND_START: 'Round start', PROMPT_VOTE: 'Prompt vote',
  PROMPT_RESULT: 'Prompt result', SIDES_REVEALED: 'Sides revealed', SPEECH_1: 'First speech', SPEECH_2: 'Second speech',
  DEBATE_CHAT: 'Debate chat', BALLOT: 'Ballot', ROUND_RESULT: 'Round result', TIEBREAK: 'Sudden death',
  MAYOR_ANNOUNCED: 'The mayor is…', SECRET_REVEAL: 'Secret reveal', AWARDS: 'Awards', NEXT_ELECTION: 'Next election',
};

/** Week 1 stand-in for every in-game screen: shows the current phase and the server-owned countdown. */
export function Playing({ view, skew, onSkip, canSkip }: { view: RoomView; skew: number; onSkip: () => void; canSkip: boolean }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);
  const left = view.phaseEndsAt === null ? null : Math.max(0, Math.ceil((view.phaseEndsAt - (Date.now() + skew)) / 1000));
  return (
    <Scene daisies={10} seed={4}>
      <div className="phase-card" role="status" aria-live="polite">
        <h2>{LABELS[view.phase] ?? view.phase}</h2>
        <div className="timer">{left === null ? '—' : left}</div>
        <p style={{ margin: '8px 0 0', fontSize: 15 }}>Game screens arrive in week 2.</p>
        {canSkip && (
          <button type="button" className="pill" style={{ color: 'var(--slate)', borderColor: 'var(--slate)', marginTop: 12 }} onClick={onSkip}>Skip phase (host)</button>
        )}
      </div>
    </Scene>
  );
}
