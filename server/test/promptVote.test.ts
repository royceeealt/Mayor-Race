import { describe, expect, it } from 'vitest';
import { allVoted, assignSides, drawPromptOptions, tallyPrompt } from '../src/game/promptVote.js';

const pool = Array.from({ length: 10 }, (_, i) => `q${i}`);

describe('drawPromptOptions', () => {
  it('returns 3 distinct prompts, none already used', () => {
    const used = ['q0', 'q1', 'q2'];
    const o = drawPromptOptions(pool, used);
    expect(new Set(o).size).toBe(3);
    expect(o.some((x) => used.includes(x))).toBe(false);
  });
  it('still returns 3 when the pool runs short', () => {
    expect(drawPromptOptions(pool, pool.slice(0, 8))).toHaveLength(3);
  });
});

describe('tallyPrompt', () => {
  const options = ['q1', 'q2', 'q3'];
  const eligible = ['a', 'b', 'c', 'd'];

  it('picks the most voted prompt and its percentage', () => {
    const r = tallyPrompt(options, { a: 'q2', b: 'q2', c: 'q2', d: 'q1' }, eligible);
    expect(r.winnerId).toBe('q2');
    expect(r.percent).toBe(75);
  });
  it('ignores candidates, strangers and unknown prompts', () => {
    const r = tallyPrompt(options, { a: 'q1', x: 'q3', y: 'q3', b: 'constructor' }, eligible);
    expect(r.totalVotes).toBe(1);
    expect(r.winnerId).toBe('q1');
  });
  it('breaks ties with the rng', () => {
    const votes = { a: 'q1', b: 'q2' };
    expect(tallyPrompt(options, votes, eligible, () => 0).winnerId).toBe('q1');
    expect(tallyPrompt(options, votes, eligible, () => 0.99).winnerId).toBe('q2');
  });
  it('picks a prompt even if nobody voted', () => {
    const r = tallyPrompt(options, {}, eligible);
    expect(options).toContain(r.winnerId);
    expect(r.percent).toBe(0);
  });
});

describe('allVoted', () => {
  it('is true only when every eligible voter has voted', () => {
    expect(allVoted({ a: 'q1' }, ['a', 'b'])).toBe(false);
    expect(allVoted({ a: 'q1', b: 'q2' }, ['a', 'b'])).toBe(true);
    expect(allVoted({}, [])).toBe(false);
  });
});

describe('assignSides', () => {
  it('gives the two candidates opposite sides', () => {
    for (let i = 0; i < 20; i++) {
      const s = assignSides(['a', 'b']);
      expect(s.a).not.toBe(s.b);
    }
  });
  it('varies which candidate gets Agree', () => {
    expect(assignSides(['a', 'b'], () => 0).a).toBe('agree');
    expect(assignSides(['a', 'b'], () => 0.9).a).toBe('disagree');
  });
});