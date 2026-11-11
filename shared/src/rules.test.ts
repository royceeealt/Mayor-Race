import { describe, expect, it } from 'vitest';
import { defaultRounds, specialRolesForPlayerCount, voterCount, ABILITY_LIMITS } from './constants.js';

describe('role counts (brief 2.2)', () => {
  it.each([
    [3, []],
    [4, ['booing']],
    [5, ['booing', 'snitch']],
    [6, ['booing', 'snitch', 'biased']],
    [7, ['booing', 'snitch', 'biased']],
    [8, ['booing', 'snitch', 'biased', 'rumour']],
    [12, ['booing', 'snitch', 'biased', 'rumour']],
  ])('%i players', (n, roles) => {
    expect([...specialRolesForPlayerCount(n)].sort()).toEqual([...roles].sort());
  });
  it('voters are players minus the two candidates', () => {
    expect(voterCount(3)).toBe(1);
    expect(voterCount(12)).toBe(10);
  });
  it('rounds: 3 by default, 5 from 9 players', () => {
    expect(defaultRounds(8)).toBe(3);
    expect(defaultRounds(9)).toBe(5);
  });
  it('ability limits match the brief', () => {
    expect(ABILITY_LIMITS.booing.total).toBe(3);
    expect(ABILITY_LIMITS.rumour).toMatchObject({ total: 2, perRound: 1 });
    expect(ABILITY_LIMITS.snitch.total).toBe(1);
  });
});
