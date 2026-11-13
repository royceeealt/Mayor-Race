
export interface CandidateName {
  id: string;
  name: string;
}

export type BallotMatch =
  | { status: 'matched'; candidate: CandidateName }
  | { status: 'ambiguous' }
  | { status: 'not_found' };

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function levenshteinDistance(a: string, b: string): number {
  const dp = Array.from(
    { length: a.length + 1 },
    () => Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
}

export function matchCandidateName(
  input: string,
  candidates: CandidateName[],
): BallotMatch {
  const query = normalizeName(input);

  if (!query || candidates.length !== 2) {
    return { status: 'not_found' };
  }

  const normalized = candidates.map((candidate) => ({
    candidate,
    name: normalizeName(candidate.name),
  }));

  // Exact matches always take priority.
  const exact = normalized.filter((item) => item.name === query);

  if (exact.length === 1) {
    return { status: 'matched', candidate: exact[0].candidate };
  }

  if (exact.length > 1) {
    return { status: 'ambiguous' };
  }

  const ranked = normalized
    .map((item) => ({
      ...item,
      distance: levenshteinDistance(query, item.name),
    }))
    .sort((a, b) => a.distance - b.distance);

  const best = ranked[0];
  const second = ranked[1];

  const maxDistance =
    query.length <= 4 ? 1 :
    query.length <= 8 ? 2 : 3;

  if (best.distance > maxDistance) {
    return { status: 'not_found' };
  }

  // Don't guess if both candidates are similarly close.
  if (best.distance === second.distance) {
    return { status: 'ambiguous' };
  }

  return {
    status: 'matched',
    candidate: best.candidate,
  };
}
