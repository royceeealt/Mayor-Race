// XState round machine skeleton (CLAUDE.md 6.4). The SERVER owns every timer: each phase sets `phaseEndsAt`
// and uses an XState `after` delay. Clients only render a countdown from phaseEndsAt.
// Week 1: phases advance on timers with no game content. Week 2 fills in what happens inside each phase.
import { assign, createActor, setup } from 'xstate';
import { PHASES, PHASE_SECONDS, SKIPPABLE_PHASES, type Phase } from '@mayor-race/shared';

export interface MachineContext {
  phaseEndsAt: number | null;
  round: number; // 0-based index of the current round
  totalRounds: number;
  speechSeconds: number;
  tieBreak: boolean;
}

export type MachineEvent =
  | { type: 'START'; totalRounds: number; speechSeconds: number }
  | { type: 'SKIP' } // host skip_phase (only skippable phases listen to it)
  | { type: 'TIE' } // week 2: final round ended level -> sudden death
  | { type: 'REMATCH' }
  | { type: 'ABORT' }; // fewer than 3 players remain, etc.

export function phaseSeconds(phase: Phase, speechSeconds: number): number | null {
  if (phase === 'SPEECH_1' || phase === 'SPEECH_2') return speechSeconds;
  return PHASE_SECONDS[phase];
}

const delays = Object.fromEntries(
  PHASES.map((p) => [`${p}_TIMER`, ({ context }: { context: MachineContext }) => (phaseSeconds(p, context.speechSeconds) ?? 0) * 1000]),
) as Record<string, (a: { context: MachineContext }) => number>;

/** The straight-line order from section 6.4. ROUND_RESULT branches (next round / tiebreak / mayor). */
const NEXT: Partial<Record<Phase, string>> = {
  ASSIGN_ROLES: 'ROLE_REVEAL',
  ROLE_REVEAL: 'ROUND_START',
  ROUND_START: 'PROMPT_VOTE',
  PROMPT_VOTE: 'PROMPT_RESULT',
  PROMPT_RESULT: 'SIDES_REVEALED',
  SIDES_REVEALED: 'SPEECH_1',
  SPEECH_1: 'SPEECH_2',
  SPEECH_2: 'DEBATE_CHAT',
  DEBATE_CHAT: 'BALLOT',
  BALLOT: 'ROUND_RESULT',
  TIEBREAK: 'BALLOT',
  MAYOR_ANNOUNCED: 'SECRET_REVEAL',
  SECRET_REVEAL: 'AWARDS',
  AWARDS: 'NEXT_ELECTION',
};

function buildStates() {
  const states: Record<string, any> = {};
  for (const phase of PHASES) {
    const state: Record<string, any> = {};
    const secs = PHASE_SECONDS[phase];
    const isSpeech = phase === 'SPEECH_1' || phase === 'SPEECH_2';
    const next = NEXT[phase];

    if (phase !== 'LOBBY') {
      state.entry = assign({
        phaseEndsAt: ({ context }: { context: MachineContext }) => {
          const s = phaseSeconds(phase, context.speechSeconds);
          return s === null || s === 0 ? null : Date.now() + s * 1000;
        },
      });
    }

    if (phase === 'LOBBY') {
      state.entry = assign({ phaseEndsAt: null, round: 0, tieBreak: false });
      state.on = { START: { target: 'ASSIGN_ROLES', actions: assign({
        totalRounds: ({ event }) => (event as any).totalRounds,
        speechSeconds: ({ event }) => (event as any).speechSeconds,
      }) } };
    } else if (phase === 'ASSIGN_ROLES') {
      state.always = { target: 'ROLE_REVEAL' }; // week 2: assign candidates and roles here
    } else if (phase === 'ROUND_RESULT') {
      const branches = [
        { guard: 'goToMayor', target: 'MAYOR_ANNOUNCED' },
        { guard: 'hasMoreRounds', target: 'ROUND_START', actions: assign({ round: ({ context }: any) => context.round + 1 }) },
        { target: 'MAYOR_ANNOUNCED' },
      ];
      state.after = { ROUND_RESULT_TIMER: branches };
      state.on = {
        SKIP: branches,
        TIE: { guard: 'canTiebreak', target: 'TIEBREAK', actions: assign({ tieBreak: true }) },
      };
    } else if (phase === 'NEXT_ELECTION') {
      state.on = { REMATCH: 'LOBBY' };
    } else if (next && secs !== null && secs !== undefined) {
      state.after = { [`${phase}_TIMER`]: next };
      if (SKIPPABLE_PHASES.includes(phase) && !isSpeech) state.on = { SKIP: next };
      if (isSpeech) state.on = { SKIP: next }; // speeches end early via finish_speech (week 2)
    }
    states[phase] = state;
  }
  return states;
}

export const phaseMachine = setup({
  types: { context: {} as MachineContext, events: {} as MachineEvent },
  delays: delays as any,
  guards: {
    goToMayor: ({ context }) => context.tieBreak,
    hasMoreRounds: ({ context }) => context.round + 1 < context.totalRounds,
    canTiebreak: ({ context }) => !context.tieBreak && context.round + 1 >= context.totalRounds,
  },
}).createMachine({
  id: 'mayorRace',
  initial: 'LOBBY',
  context: { phaseEndsAt: null, round: 0, totalRounds: 3, speechSeconds: 45, tieBreak: false },
  on: { ABORT: { target: '.LOBBY' } },
  states: buildStates(),
});

export function createPhaseActor() {
  return createActor(phaseMachine);
}
export type PhaseActor = ReturnType<typeof createPhaseActor>;
