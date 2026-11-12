import { describe, expect, it } from 'vitest';
import { RoomModel } from '../src/game/roomModel.js';
import { buildRoomView } from '../src/game/views.js';

function game() {
  const m = new RoomModel('ABCD');
  const avatars = ['frog', 'cat', 'shark', 'pigeon', 'crab', 'ladybug'] as const;
  avatars.forEach((a, i) => m.join(`p${i}`, { name: `P${i}`, avatar: a }));
  m.players.get('p0')!.role = 'candidate';
  m.players.get('p1')!.role = 'candidate';
  m.players.get('p2')!.role = 'biased';
  m.players.get('p2')!.favourite = 'p0';
  m.players.get('p3')!.role = 'snitch';
  m.players.get('p3')!.usesLeft = 1;
  m.players.get('p4')!.role = 'booing';
  m.players.get('p4')!.usesLeft = 3;
  return m;
}

describe('secrecy filter', () => {
  it('shows no roles at all in the lobby', () => {
    const m = game();
    const v = buildRoomView(m, 'p3', 0);
    expect(v.you.role).toBeNull();
    expect(JSON.stringify(v)).not.toContain('snitch');
  });

  it('shows a player only their own role, and only the Biased Guy their favourite', () => {
    const m = game();
    m.phase = 'PROMPT_VOTE';
    const biased = buildRoomView(m, 'p2', 0);
    expect(biased.you.role).toBe('biased');
    expect(biased.you.favourite).toBe('p0');
    const snitch = buildRoomView(m, 'p3', 0);
    expect(snitch.you.role).toBe('snitch');
    expect(snitch.you.favourite).toBeUndefined();
    const json = JSON.stringify(snitch);
    expect(json).not.toContain('biased');
    expect(json).not.toContain('booing');
    expect(json).not.toContain('favourite');
    expect(snitch.reveal).toBeUndefined();
  });

  it('candidates are public, other roles are not', () => {
    const m = game();
    m.phase = 'BALLOT';
    const v = buildRoomView(m, 'p5', 0);
    expect(v.players.filter((p) => p.isCandidate).map((p) => p.id)).toEqual(['p0', 'p1']);
    expect(Object.keys(v.players[2])).not.toContain('role');
  });

  it('reveals every role only from SECRET_REVEAL', () => {
    const m = game();
    m.phase = 'MAYOR_ANNOUNCED';
    expect(buildRoomView(m, 'p5', 0).reveal).toBeUndefined();
    m.phase = 'SECRET_REVEAL';
    const v = buildRoomView(m, 'p5', 0);
    expect(v.reveal?.roles.p2).toBe('biased');
    expect(v.reveal?.favourites.p2).toBe('p0');
  });

  it('spectators never get a role', () => {
    const m = game();
    m.phase = 'BALLOT';
    m.join('spec', { name: 'Spec', avatar: 'fish' });
    expect(buildRoomView(m, 'spec', 0).you.role).toBeNull();
  });
});
