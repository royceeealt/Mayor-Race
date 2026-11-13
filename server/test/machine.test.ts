
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPhaseActor } from '../src/game/machine.js';

type A = ReturnType<typeof createPhaseActor>;

const phase = (a: A) =>
  a.getSnapshot().value as unknown as string;

/** Advance until target, capped to prevent infinite loops. */
function advanceTo(a: A, target: string, seen?: Set<string>) {
  for (let i = 0; i < 2000 && phase(a) !== target; i++) {
    seen?.add(phase(a));
    a.send({ type: 'SKIP' });
    vi.advanceTimersByTime(1000);
  }

  expect(phase(a)).toBe(target);
}

describe('phase machine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stays in LOBBY until START, then runs through role reveal on a server timer', () => {
    const a = createPhaseActor();
    a.start();

    expect(phase(a)).toBe('LOBBY');

    vi.advanceTimersByTime(60_000);

    expect(phase(a)).toBe('LOBBY');

    a.send({
      type: 'START',
      totalRounds: 3,
      speechSeconds: 45,
    });

    expect(phase(a)).toBe('ROLE_REVEAL');

    expect(
      a.getSnapshot().context.phaseEndsAt,
    ).toBeGreaterThan(Date.now());
  });

  it('PROMPT_VOTE lasts 15 s, speeches use the host setting', () => {
    const a = createPhaseActor();
    a.start();

    a.send({
      type: 'START',
      totalRounds: 3,
      speechSeconds: 30,
    });

    vi.advanceTimersByTime(12_000 + 3_000);

    expect(phase(a)).toBe('PROMPT_VOTE');

    vi.advanceTimersByTime(14_999);

    expect(phase(a)).toBe('PROMPT_VOTE');

    vi.advanceTimersByTime(1);

    expect(phase(a)).toBe('PROMPT_RESULT');

    vi.advanceTimersByTime(6_000 + 5_000);

    expect(phase(a)).toBe('SPEECH_1');

    vi.advanceTimersByTime(30_000);

    expect(phase(a)).toBe('SPEECH_2');
  });

  it('finishes PROMPT_VOTE early when all players have voted', () => {
    const a = createPhaseActor();
    a.start();

    a.send({
      type: 'START',
      totalRounds: 3,
      speechSeconds: 30,
    });

    advanceTo(a, 'PROMPT_VOTE');

    expect(phase(a)).toBe('PROMPT_VOTE');

    a.send({
      type: 'PROMPT_VOTING_COMPLETE',
    });

    expect(phase(a)).toBe('PROMPT_RESULT');
  });

  it('plays the right number of rounds then announces the mayor', () => {
    const a = createPhaseActor();
    a.start();

    a.send({
      type: 'START',
      totalRounds: 2,
      speechSeconds: 30,
    });

    const seen = new Set<string>();

    advanceTo(a, 'NEXT_ELECTION', seen);

    expect(a.getSnapshot().context.round).toBe(1);

    expect(
      seen.has('MAYOR_ANNOUNCED') &&
      seen.has('SECRET_REVEAL') &&
      seen.has('AWARDS'),
    ).toBe(true);
  });

  it('sends a level final round to TIEBREAK, then to the mayor', () => {
    const a = createPhaseActor();
    a.start();

    a.send({
      type: 'START',
      totalRounds: 1,
      speechSeconds: 30,
    });

    advanceTo(a, 'ROUND_RESULT');

    a.send({ type: 'TIE' });

    expect(phase(a)).toBe('TIEBREAK');

    a.send({ type: 'SKIP' });

    expect(phase(a)).toBe('TIEBREAK');

    vi.advanceTimersByTime(30_000);

    expect(phase(a)).toBe('BALLOT');

    vi.advanceTimersByTime(20_000);

    expect(phase(a)).toBe('ROUND_RESULT');

    a.send({ type: 'SKIP' });

    expect(phase(a)).toBe('MAYOR_ANNOUNCED');
  });

  it('REMATCH returns to the lobby and ABORT works from any phase', () => {
    const a = createPhaseActor();
    a.start();

    a.send({
      type: 'START',
      totalRounds: 1,
      speechSeconds: 30,
    });

    a.send({ type: 'ABORT' });

    expect(phase(a)).toBe('LOBBY');

    a.send({
      type: 'START',
      totalRounds: 1,
      speechSeconds: 30,
    });

    advanceTo(a, 'NEXT_ELECTION');

    a.send({ type: 'REMATCH' });

    expect(phase(a)).toBe('LOBBY');
  });
});
