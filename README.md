# Mayor Race

Online party game: two players run for mayor, the town argues hot takes and votes in secret. Mobile first (441 × 798).
Rules and numbers live in `CLAUDE.md` (the project brief). Visual references are in `design/`.

## Run it

```bash
npm install
npm run dev:server      # Colyseus on :2567   (health check: http://localhost:2567/health)
npm run dev:client      # Vite on :5173       (open on a phone with http://<your-LAN-ip>:5173)
```

Screens without a server: open `http://localhost:5173/?mock` (other players trickle into the lobby).
Point the client at a deployed server with `VITE_SERVER_URL=wss://...` (see `client/.env.example`).

## Checks

```bash
npm run typecheck
npm test                                  # shared rules + server (role counts, lobby, secrecy filter, machine timers)
npm run live -w server                    # with the server running: two real clients, 22 end-to-end checks
```

## Layout

- `shared/src` types, constants, Zod schemas, mock room state (imported by client and server)
- `server/src/game` pure logic: `roomModel` (lobby rules), `views` (the secrecy filter), `machine` (XState phases + timers), `roomCode`
- `server/src/rooms/MayorRoom.ts` thin Colyseus room: validate intent -> model -> machine -> filtered view per client
- `client/src` screens, reusable components (`components/ui.tsx`, `art.tsx`), design tokens (`styles/tokens.css`), network (`net/`)

## Week 1 status

Done: monorepo, shared types/constants, room with join by 4-letter code, host assignment and promotion, lobby settings,
duplicate-name suffixing, spectators after start, XState skeleton with server-owned timers, `/health`,
client Home / How to play / Join / Create / Lobby built to the designs, a bare in-game screen showing phase + countdown.

Not yet (weeks 2-3): candidate and role assignment, prompt vote, speeches, ballot, scoring, abilities, chat, reconnection.
Round intents (`vote_prompt`, `boo`, `cast_ballot`, ...) are accepted by the schema and silently ignored by the room for now.

## Decisions made this week (change in one place if the team disagrees)

| Topic | What the code does | Where |
|---|---|---|
| Avatars | The 12 animals from the brief (Lolly, Zorp, Berry Bite, Mr. Coo, Pinchy, Dotty, Chef Prawn, Daisy, Sir Finley, Cap'n Squawk, Doug, Big Cheese). **The art in `client/public/characters/*.svg` is placeholder drawing; drop the real files in with the same names.** The townsfolk sheet stays in `design/` for reference only | `AVATARS` in `shared/src/constants.ts` |
| Room code | 4 letters (brief); lobby shows `AB-CD`, the design mock shows 6 characters | `ROOM_CODE_LENGTH` |
| Prompt tier | Create screen: SILLY / SERIOUS / RANDOM = `silly` / `serious` / `random` (random mixes both packs each round). The old wholesome and spicy tiers are gone | `PromptTier` in `shared/src/types.ts` |
| Candidates | RANDOM / CHOSEN = `random` / `chosen`. Who chooses (host picks, or players volunteer) is still to be decided for week 2 | `candidateMode` |
| Players stepper | 3 to 12, default 8, `+` on the left and `-` on the right exactly as in the design | `JoinCreate.tsx` |
| Avatar uniqueness | Two seated players cannot share a character; the server swaps to a free one | `roomModel.ts` |
| Casual mode | Switched on automatically for 3 to 4 players | `prepareStart()` |
| Phase lengths not in the brief | Placeholders (role reveal 12 s, round start 3 s, prompt result 6 s, sides 5 s, round result 10 s, mayor 8 s, secret reveal 15 s, awards 15 s) | `PHASE_SECONDS` |
| Added to the design | A name field on Home (the design has none); one extra intro card on How to play (the design shows 5 dots but only 4 cards) | `Home.tsx`, `HowToPlay.tsx` |
