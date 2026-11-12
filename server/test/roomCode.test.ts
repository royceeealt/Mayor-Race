import { describe, expect, it } from 'vitest';
import { ROOM_CODE_ALPHABET, roomCodeSchema } from '@mayor-race/shared';
import { generateUniqueRoomCode, randomRoomCode } from '../src/game/roomCode.js';

describe('room codes', () => {
  it('are 4 letters from the alphabet without I or O and pass the shared schema', () => {
    for (let i = 0; i < 500; i++) {
      const c = randomRoomCode();
      expect(c).toHaveLength(4);
      expect([...c].every((ch) => ROOM_CODE_ALPHABET.includes(ch))).toBe(true);
      expect(roomCodeSchema.safeParse(c).success).toBe(true);
    }
  });
  it('skips codes that are already taken', async () => {
    const seq = [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
    let i = 0;
    const rng = () => seq[i++ % seq.length];
    const code = await generateUniqueRoomCode((c) => c === 'AAAA', rng);
    expect(code).not.toBe('AAAA');
  });
});
