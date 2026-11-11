import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@mayor-race/shared';

export function randomRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(rng() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/** Keeps drawing until `isTaken` says the code is free. 24^4 = 331,776 codes, so this almost never loops. */
export async function generateUniqueRoomCode(
  isTaken: (code: string) => Promise<boolean> | boolean,
  rng: () => number = Math.random,
  maxTries = 100,
): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const code = randomRoomCode(rng);
    if (!(await isTaken(code))) return code;
  }
  throw new Error('Could not find a free room code');
}
