// Prompt vote and sides (CLAUDE.md 2.3 steps 1 and 2). Pure logic: the room feeds it votes and stores the result in ServerRound.
import { PROMPT_OPTIONS_PER_VOTE, type Side } from '@mayor-race/shared';
import { shuffle, type Rng } from './assign.js';

/** Three hot-take cards, avoiding prompts already used this game. Falls back to the full pool if it runs short. */
export function drawPromptOptions(pool: readonly string[], used: readonly string[], rng: Rng = Math.random): string[] {
  const fresh = pool.filter((id) => !used.includes(id));
  const source = fresh.length >= PROMPT_OPTIONS_PER_VOTE ? fresh : pool;
  return shuffle(source, rng).slice(0, PROMPT_OPTIONS_PER_VOTE);
}

export interface PromptTally {
  winnerId: string;
  counts: Record<string, number>;
  totalVotes: number;
  percent: number; // winner's share of the votes cast, 0 to 100
}

/** votes: voterId -> promptId. Only eligible voters (the townspeople) and listed options count. Ties are broken at random. */
export function tallyPrompt(
  options: readonly string[],
  votes: Record<string, string>,
  eligible: readonly string[],
  rng: Rng = Math.random,
): PromptTally {
  const counts: Record<string, number> = Object.fromEntries(options.map((o) => [o, 0]));
  let totalVotes = 0;
  for (const [voter, choice] of Object.entries(votes)) {
    if (!eligible.includes(voter) || !options.includes(choice)) continue;
    counts[choice]++;
    totalVotes++;
  }
  const top = Math.max(...Object.values(counts));
  const leaders = options.filter((o) => counts[o] === top);
  const winnerId = leaders[Math.floor(rng() * leaders.length)];
  const percent = totalVotes === 0 ? 0 : Math.round((counts[winnerId] / totalVotes) * 100);
  return { winnerId, counts, totalVotes, percent };
}

/** True once every eligible voter has voted: the room uses this to end PROMPT_VOTE early. */
export function allVoted(votes: Record<string, string>, eligible: readonly string[]): boolean {
  return eligible.length > 0 && eligible.every((id) => votes[id] !== undefined);
}

/** The two candidates get opposite sides; which one gets Agree is random. Matches ServerRound.sides. */
export function assignSides(candidateIds: readonly [string, string], rng: Rng = Math.random): Partial<Record<string, Side>> {
  const first: Side = rng() < 0.5 ? 'agree' : 'disagree';
  const second: Side = first === 'agree' ? 'disagree' : 'agree';
  return { [candidateIds[0]]: first, [candidateIds[1]]: second };
}
