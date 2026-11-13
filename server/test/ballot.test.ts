
import { describe, expect, it } from 'vitest';
import {
  matchCandidateName,
  normalizeName,
  levenshteinDistance,
} from '../src/game/ballot.js';

const candidates = [
  { id: 'p1', name: 'Priya' },
  { id: 'p2', name: 'Rahul' },
];

describe('ballot matching', () => {
  it('matches exact names', () => {
    expect(matchCandidateName('Priya', candidates)).toEqual({
      status: 'matched',
      candidate: candidates[0],
    });
  });

  it('matches minor spelling mistakes', () => {
    expect(matchCandidateName('Priyaa', candidates)).toEqual({
      status: 'matched',
      candidate: candidates[0],
    });
  });

  it('ignores capitalization', () => {
    expect(matchCandidateName('RAHUL', candidates)).toEqual({
      status: 'matched',
      candidate: candidates[1],
    });
  });

  it('ignores spaces and punctuation', () => {
    expect(normalizeName('Priya!')).toBe('priya');
  });

  it('rejects unknown names', () => {
    expect(matchCandidateName('Batman', candidates).status)
      .toBe('not_found');
  });

  it('rejects ambiguous matches', () => {
    const similar = [
      { id: '1', name: 'Anna' },
      { id: '2', name: 'Anya' },
    ];

    expect(matchCandidateName('Anna', similar).status)
      .toBe('matched');

    expect(matchCandidateName('Anma', similar).status)
      .toBe('ambiguous');
  });

  it('calculates edit distance', () => {
    expect(levenshteinDistance('priya', 'pria')).toBe(1);
  });
});
