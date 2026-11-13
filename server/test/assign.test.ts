import { describe, expect, it } from 'vitest';
import { ABILITY_LIMITS, specialRolesForPlayerCount, type ServerPlayer } from '@mayor-race/shared';
import { assignRoles, shuffle } from '../src/game/assign.js';

const AVATARS = ['frog', 'cat', 'shark', 'pigeon', 'crab', 'ladybug', 'shrimp', 'puppy', 'fish', 'parrot', 'duck', 'rat'] as const;

const makePlayers = (n: number): ServerPlayer[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `P${i + 1}`,
    avatar: AVATARS[i],
    connected: true,
    isHost: i === 0,
    ready: false,
    role: 'townsperson',
    usesLeft: 0,
    usesThisRound: 0,
    abilityLost: false,
    score: 0,
    spectator: false,
  }));

/** Small seeded random so tests are repeatable. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('assignRoles', () => {
  for (const n of [3, 4, 5, 6, 7, 8, 9, 10, 12]) {
    it(`${n} players: 2 candidates (A and B) and the right special roles`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const players = makePlayers(n);
        const [aId, bId] = assignRoles(players, { candidateMode: 'random', rolesEnabled: true, rng: seeded(seed) });
        const cands = players.filter((p) => p.role === 'candidate');
        expect(cands.map((p) => p.id).sort()).toEqual([aId, bId].sort());
        expect(players.find((p) => p.id === aId)?.candidateSlot).toBe('A');
        expect(players.find((p) => p.id === bId)?.candidateSlot).toBe('B');
        const specials = players.filter((p) => !['candidate', 'townsperson'].includes(p.role)).map((p) => p.role).sort();
        expect(specials).toEqual([...specialRolesForPlayerCount(n)].sort());
      }
    });
  }

  it('candidates never get special roles, abilities or a favourite', () => {
    const players = makePlayers(12);
    assignRoles(players, { candidateMode: 'random', rolesEnabled: true, rng: seeded(7) });
    for (const c of players.filter((p) => p.role === 'candidate')) {
      expect(c.usesLeft).toBe(0);
      expect(c.favourite).toBeUndefined();
    }
  });

  it('ability limits are set from the brief (3 tomatoes, 2 rumours, 1 accusation)', () => {
    const players = makePlayers(12);
    assignRoles(players, { candidateMode: 'random', rolesEnabled: true, rng: seeded(3) });
    expect(players.find((p) => p.role === 'booing')?.usesLeft).toBe(ABILITY_LIMITS.booing.total);
    expect(players.find((p) => p.role === 'rumour')?.usesLeft).toBe(2);
    expect(players.find((p) => p.role === 'snitch')?.usesLeft).toBe(1);
    expect(players.find((p) => p.role === 'biased')?.usesLeft).toBe(0);
  });

  it('the Biased Guy gets a candidate as their secret favourite', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const players = makePlayers(8);
      const [aId, bId] = assignRoles(players, { candidateMode: 'random', rolesEnabled: true, rng: seeded(seed) });
      const biased = players.find((p) => p.role === 'biased');
      expect([aId, bId]).toContain(biased?.favourite);
    }
  });

  it('roles switched off: only candidates and plain townspeople', () => {
    const players = makePlayers(10);
    assignRoles(players, { candidateMode: 'random', rolesEnabled: false });
    expect(players.filter((p) => p.role === 'candidate')).toHaveLength(2);
    expect(players.filter((p) => p.role === 'townsperson')).toHaveLength(8);
  });

  it('chosen mode: volunteers become candidates; missing slots are filled at random', () => {
    const two = makePlayers(6);
    assignRoles(two, { candidateMode: 'chosen', volunteers: ['p4', 'p6'], rolesEnabled: true });
    expect(two.filter((p) => p.role === 'candidate').map((p) => p.id).sort()).toEqual(['p4', 'p6']);

    const one = makePlayers(6);
    assignRoles(one, { candidateMode: 'chosen', volunteers: ['p5'], rolesEnabled: true });
    const cands = one.filter((p) => p.role === 'candidate').map((p) => p.id);
    expect(cands).toHaveLength(2);
    expect(cands).toContain('p5');

    const many = makePlayers(6);
    assignRoles(many, { candidateMode: 'chosen', volunteers: ['p1', 'p2', 'p3'], rolesEnabled: true });
    const picked = many.filter((p) => p.role === 'candidate').map((p) => p.id);
    expect(picked).toHaveLength(2);
    picked.forEach((id) => expect(['p1', 'p2', 'p3']).toContain(id));
  });

  it('ignores spectators and disconnected players', () => {
    const players = makePlayers(7);
    players[1].spectator = true;
    players[2].connected = false;
    assignRoles(players, { candidateMode: 'random', rolesEnabled: true, rng: seeded(11) });
    expect(players[1].role).toBe('townsperson');
    expect(players[2].role).toBe('townsperson');
    expect(players.filter((p) => p.role === 'candidate').every((p) => !p.spectator && p.connected)).toBe(true);
    // 5 active players: Booing Guy and Snitch only.
    const specials = players.filter((p) => !['candidate', 'townsperson'].includes(p.role)).map((p) => p.role).sort();
    expect(specials).toEqual(['booing', 'snitch']);
  });

  it('a rematch starts from a clean slate', () => {
    const players = makePlayers(8);
    assignRoles(players, { candidateMode: 'random', rolesEnabled: true, rng: seeded(1) });
    assignRoles(players, { candidateMode: 'random', rolesEnabled: true, rng: seeded(2) });
    expect(players.filter((p) => p.role === 'candidate')).toHaveLength(2);
    expect(players.filter((p) => p.role === 'biased')).toHaveLength(1);
    expect(players.filter((p) => p.favourite !== undefined)).toHaveLength(1);
  });

  it('refuses to start with fewer than 3 players', () => {
    expect(() => assignRoles(makePlayers(2), { candidateMode: 'random', rolesEnabled: true })).toThrow();
  });

  it('shuffle keeps every item exactly once', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(5)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
