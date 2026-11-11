// shared/src/schemas.ts
// Zod schemas for every client intent (section 6.6). The server MUST parse every message with these.
import { z } from 'zod';
import { AVATARS, MAX_PLAYERS, MIN_PLAYERS, SPEECH_SECONDS_OPTIONS } from './constants.js';

export const nameSchema = z.string().trim().min(1).max(16);
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z]{4}$/);

export const settingsSchema = z.object({
  rounds: z.number().int().min(1).max(9),
  speechSeconds: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  promptTier: z.enum(['silly', 'serious', 'random']),
  candidateMode: z.enum(['random', 'chosen']),
  rolesEnabled: z.boolean(),
  casualMode: z.boolean(),
  maxPlayers: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS),
});

export const joinOptionsSchema = z.object({
  code: roomCodeSchema.optional(), // omitted when creating
  name: nameSchema,
  avatar: z.enum(AVATARS),
});

export const intentSchemas = {
  // Player
  ready: z.object({ ready: z.boolean() }),
  set_name: z.object({ name: nameSchema }),
  set_avatar: z.object({ avatar: z.enum(AVATARS) }),
  chat: z.object({ text: z.string().trim().min(1).max(200) }),
  react: z.object({ kind: z.enum(['tomato', 'star', 'question']), messageId: z.string().optional() }),
  leave: z.object({}),
  volunteer: z.object({ volunteer: z.boolean() }), // only when candidateMode = chosen

  // Host
  start_game: z.object({}),
  kick: z.object({ playerId: z.string() }),
  change_settings: settingsSchema.partial(),
  rematch: z.object({}),
  skip_phase: z.object({}),

  // Round
  vote_prompt: z.object({ promptId: z.string() }),
  finish_speech: z.object({}), // candidate ends their own speech early
  boo: z.object({}), // target is always the current speaker
  spread_rumour: z.object({ targetId: z.string() }), // server picks the card; change if the spreader should choose
  accuse: z.object({ targetId: z.string(), claimed: z.enum(['biased', 'rumour']) }),
  cast_ballot: z.object({ name: z.string().trim().min(1).max(24) }), // free text, server fuzzy-matches
  confirm_ballot: z.object({ candidateId: z.string() }), // "Is that Priya?" yes (open question 9.2 default)
} as const;

export type IntentName = keyof typeof intentSchemas;
export type IntentPayload<K extends IntentName> = z.infer<(typeof intentSchemas)[K]>;
