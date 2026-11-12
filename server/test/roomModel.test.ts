import { describe, expect, it } from 'vitest';
import { RoomModel, RoomError, uniqueName } from '../src/game/roomModel.js';

const join = (m: RoomModel, id: string, name = id, avatar: any = 'frog') => m.join(id, { name, avatar });

describe('lobby', () => {
  it('first player becomes host; host passes on when they leave', () => {
    const m = new RoomModel('ABCD');
    join(m, 'a'); join(m, 'b', 'b', 'cat'); join(m, 'c', 'c', 'shark');
    expect(m.host?.id).toBe('a');
    const res = m.leave('a');
    expect(res.newHostId).toBe('b');
    expect(m.host?.id).toBe('b');
    expect(m.players.size).toBe(2);
  });

  it('auto-suffixes duplicate names (Priya, Priya 2)', () => {
    expect(uniqueName('Priya', ['Priya'])).toBe('Priya 2');
    expect(uniqueName('priya', ['Priya', 'Priya 2'])).toBe('priya 3');
    const m = new RoomModel('ABCD');
    join(m, 'a', 'Priya'); const p = join(m, 'b', 'Priya', 'cat').player;
    expect(p.name).toBe('Priya 2');
  });

  it('gives a free avatar when the wanted one is taken', () => {
    const m = new RoomModel('ABCD');
    join(m, 'a', 'a', 'frog');
    expect(join(m, 'b', 'b', 'frog').player.avatar).not.toBe('frog');
    expect(m.setAvatar('b', 'frog')).toBe(false);
  });

  it('rejects joins when full and caps at settings.maxPlayers', () => {
    const m = new RoomModel('ABCD', { maxPlayers: 3 });
    join(m, 'a'); join(m, 'b', 'b', 'cat'); join(m, 'c', 'c', 'shark');
    expect(() => join(m, 'd', 'd', 'crab')).toThrow(RoomError);
  });

  it('only the host can change settings, and the cap never drops below seated players', () => {
    const m = new RoomModel('ABCD', { maxPlayers: 8 });
    join(m, 'a'); join(m, 'b', 'b', 'cat'); join(m, 'c', 'c', 'shark'); join(m, 'd', 'd', 'crab');
    expect(m.changeSettings('b', { maxPlayers: 5 })).toBe(false);
    expect(m.changeSettings('a', { maxPlayers: 3 })).toBe(true);
    expect(m.settings.maxPlayers).toBe(4);
  });

  it('start needs the host and at least 3 players; sets rounds and casual mode', () => {
    const m = new RoomModel('ABCD');
    join(m, 'a'); join(m, 'b', 'b', 'cat');
    expect(m.canStart('a')).toBe(false);
    join(m, 'c', 'c', 'shark');
    expect(m.canStart('b')).toBe(false);
    expect(m.canStart('a')).toBe(true);
    m.prepareStart();
    expect(m.settings.casualMode).toBe(true); // 3 players = casual
    expect(m.settings.rounds).toBe(3);
  });

  it('keeps host-chosen rounds, and uses 5 rounds for 9+ players by default', () => {
    const m = new RoomModel('ABCD', { maxPlayers: 12 });
    const avatars = ['frog','cat','shark','pigeon','crab','ladybug','shrimp','puppy','fish'] as const;
    avatars.forEach((a, i) => join(m, `p${i}`, `p${i}`, a));
    m.prepareStart();
    expect(m.settings.rounds).toBe(5);
    const m2 = new RoomModel('ABCD', { rounds: 4, maxPlayers: 12 });
    avatars.forEach((a, i) => join(m2, `p${i}`, `p${i}`, a));
    m2.prepareStart();
    expect(m2.settings.rounds).toBe(4);
  });

  it('late joiners after start are spectators and do not take a seat', () => {
    const m = new RoomModel('ABCD');
    join(m, 'a'); join(m, 'b', 'b', 'cat'); join(m, 'c', 'c', 'shark');
    m.phase = 'PROMPT_VOTE';
    const r = join(m, 'late', 'late', 'crab');
    expect(r.spectator).toBe(true);
    expect(m.seated.length).toBe(3);
  });

  it('in game, leaving keeps the seat but marks disconnected; host still passes on', () => {
    const m = new RoomModel('ABCD');
    join(m, 'a'); join(m, 'b', 'b', 'cat'); join(m, 'c', 'c', 'shark');
    m.phase = 'BALLOT';
    const res = m.leave('a');
    expect(res.removed).toBe(false);
    expect(m.players.get('a')?.connected).toBe(false);
    expect(res.newHostId).toBe('b');
    expect(m.connectedSeatedCount).toBe(2);
  });
});
