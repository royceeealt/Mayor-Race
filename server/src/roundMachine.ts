import { setup, assign } from "xstate";

interface Ctx {
  round: number;        // 0 until the first ROUND_START
  totalRounds: number;
  speechMs: number;
  phaseEndsAt: number;  // epoch ms, clients display the countdown from this
  tied: boolean;        // placeholder until scoring exists
}

type Ev =
  | { type: "START"; totalRounds: number; speechSeconds: number }
  | { type: "SKIP" }       // host skip_phase
  | { type: "ALL_VOTED" }  // ends PROMPT_VOTE / BALLOT early
  | { type: "ABORT" }      // fewer than 3 players left
  | { type: "REMATCH" };

const stamp = (ms: number) => assign({ phaseEndsAt: () => Date.now() + ms });

// A timed phase: stamps its end time, advances when the server timer fires,
// and can be skipped by the host.
function timed(ms: number, next: any, extra: any = {}) {
  return {
    entry: stamp(ms),
    after: { [ms]: next },
    on: { SKIP: next },
    ...extra,
  };
}

export const roundMachine = setup({
  types: { context: {} as Ctx, events: {} as Ev },
  guards: {
    isTied: ({ context }) => context.tied,
    hasMoreRounds: ({ context }) => context.round < context.totalRounds,
  },
  delays: {
    speech: ({ context }) => context.speechMs,
  },
}).createMachine({
  id: "mayorRace",
  initial: "LOBBY",
  context: { round: 0, totalRounds: 3, speechMs: 45000, phaseEndsAt: 0, tied: false },
  on: { ABORT: ".NEXT_ELECTION" },
  states: {
    LOBBY: {
      on: {
        START: {
          target: "ASSIGN_ROLES",
          actions: assign({
            round: 0,
            tied: false,
            totalRounds: ({ event }) => event.totalRounds,
            speechMs: ({ event }) => event.speechSeconds * 1000,
          }),
        },
      },
    },

    // Instant. Real role assignment lands in milestone 2.
    ASSIGN_ROLES: { always: "ROLE_REVEAL" },

    ROLE_REVEAL: timed(10000, "ROUND_START"),

    ROUND_START: timed(3000, "PROMPT_VOTE", {
      entry: [assign({ round: ({ context }) => context.round + 1 }), stamp(3000)],
    }),

    PROMPT_VOTE: timed(15000, "PROMPT_RESULT", {
      on: { SKIP: "PROMPT_RESULT", ALL_VOTED: "PROMPT_RESULT" },
    }),
    PROMPT_RESULT: timed(5000, "SIDES_REVEALED"),
    SIDES_REVEALED: timed(5000, "SPEECH_1"),

    SPEECH_1: {
      entry: assign({ phaseEndsAt: ({ context }) => Date.now() + context.speechMs }),
      after: { speech: "SPEECH_2" },
      on: { SKIP: "SPEECH_2" },
    },
    SPEECH_2: {
      entry: assign({ phaseEndsAt: ({ context }) => Date.now() + context.speechMs }),
      after: { speech: "DEBATE_CHAT" },
      on: { SKIP: "DEBATE_CHAT" },
    },

    DEBATE_CHAT: timed(90000, "BALLOT"),

    BALLOT: timed(20000, "ROUND_RESULT", {
      on: { SKIP: "ROUND_RESULT", ALL_VOTED: "ROUND_RESULT" },
    }),

    ROUND_RESULT: timed(
      8000,
      [
        { guard: "isTied", target: "TIEBREAK" },
        { guard: "hasMoreRounds", target: "ROUND_START" },
        { target: "MAYOR_ANNOUNCED" },
      ]
    ),

    // 30 s sudden-death speech, then a final ballot (section 2.3.1)
    TIEBREAK: timed(30000, "BALLOT", {
      entry: [assign({ tied: false }), stamp(30000)], // placeholder until scoring
    }),

    MAYOR_ANNOUNCED: timed(8000, "SECRET_REVEAL"),
    SECRET_REVEAL: timed(10000, "AWARDS"),
    AWARDS: timed(10000, "NEXT_ELECTION"),

    NEXT_ELECTION: { on: { REMATCH: "LOBBY" } },
  },
});