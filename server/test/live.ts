// Manual end-to-end check against a running server:  npm run start (one terminal), npm run live (another)
import { Client } from '@colyseus/sdk';
import { ROOM_NAME, type RoomView } from '@mayor-race/shared';

const URL = process.env.URL ?? 'ws://localhost:2567';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };

function track(room: any) {
  const s: { view?: RoomView; notices: any[]; ticks: number } = { notices: [], ticks: 0 };
  room.onMessage('state_changed', (v: RoomView) => (s.view = v));
  room.onMessage('notice', (n: any) => s.notices.push(n));
  room.onMessage('timer_tick', () => s.ticks++);
  return s;
}

const a = new Client(URL);
const roomA: any = await a.create(ROOM_NAME, { name: 'Priya', avatar: 'frog', settings: { maxPlayers: 4 } });
const sa = track(roomA);
await sleep(200);
const code = roomA.roomId;
ok(/^[A-HJ-NP-Z]{4}$/.test(code), `room code is 4 letters: ${code}`);
ok(sa.view?.players.length === 1 && sa.view.players[0].isHost, 'creator is host');
ok(sa.view?.settings.maxPlayers === 4, 'create settings applied');

const b = new Client(URL);
const roomB: any = await b.joinById(code, { name: 'Priya', avatar: 'frog' });
const sb = track(roomB);
await sleep(200);
ok(sa.view?.players.length === 2 && sb.view?.players.length === 2, 'second phone joins by code, both see 2 players');
ok(sb.view?.players[1].name === 'Priya 2', 'duplicate name auto-suffixed');
ok(sb.view?.players.find((p) => p.id === roomB.sessionId)?.avatar !== 'frog', 'duplicate avatar swapped');
ok(sb.view?.players.find((p) => p.id === roomB.sessionId)?.isHost === false, 'joiner is not host');

// non-host cannot start or change settings
roomB.send('change_settings', { maxPlayers: 10 });
roomB.send('start_game', {});
await sleep(150);
ok(sa.view?.settings.maxPlayers === 4 && sa.view.phase === 'LOBBY', 'non-host start/settings ignored');

// host changes settings, ready toggles
roomA.send('change_settings', { maxPlayers: 6, promptTier: 'serious' });
roomB.send('ready', { ready: true });
await sleep(150);
ok(sb.view?.settings.maxPlayers === 6 && sb.view.settings.promptTier === 'serious', 'host settings propagate');
ok(sa.view?.players[1].ready === true, 'ready propagates');

// errors
try { await new Client(URL).joinById('ZZZZ', { name: 'X', avatar: 'frog' }); ok(false, 'unknown code should fail'); }
catch (e: any) { ok(true, `unknown code rejected: code=${e.code} msg=${e.message}`); }
try { await new Client(URL).joinById(code, { name: '', avatar: 'nope' }); ok(false, 'bad options should fail'); }
catch (e: any) { ok(e.message.includes('INVALID_OPTIONS'), `bad options rejected: ${e.message}`); }

// start needs 3 players
roomA.send('start_game', {});
await sleep(150);
ok(sa.view?.phase === 'LOBBY', 'cannot start with 2 players');

const c = new Client(URL);
const roomC: any = await c.joinById(code, { name: 'Sam', avatar: 'cat' });
const sc = track(roomC);
await sleep(150);
roomA.send('start_game', {});
await sleep(400);
ok(sa.view?.phase === 'ROLE_REVEAL', `host starts with 3 players -> ${sa.view?.phase}`);
ok(sa.view?.phaseEndsAt != null && sa.view.phaseEndsAt > sa.view.serverNow, 'server-owned deadline sent');
ok(sa.view?.settings.casualMode === true, '3 players -> casual mode');
await sleep(1200);
ok(sa.ticks >= 1, 'timer_tick events arrive');

// late joiner becomes a spectator
const d = new Client(URL);
const roomD: any = await d.joinById(code, { name: 'Late', avatar: 'crab' });
const sd = track(roomD);
await sleep(200);
ok(sd.view?.players.find((p) => p.id === roomD.sessionId)?.spectator === true, 'late joiner is a spectator');

// host leaves -> promotion; payload never contains role names
roomA.leave();
await sleep(300);
ok(sb.view?.players.find((p) => p.id === roomB.sessionId)?.isHost === true, 'host promoted when host leaves');
ok(sb.notices.some((n) => n.kind === 'host_changed'), 'host_changed notice sent');
ok(!JSON.stringify(sb.view).match(/snitch|booing|biased|rumour/), 'no secret role names in payload');

// drop to <3 connected players mid-game -> game aborted back to lobby
roomC.leave();
await sleep(300);
ok(sb.view?.phase === 'LOBBY' && sb.notices.some((n) => n.kind === 'game_aborted'), 'fewer than 3 players ends the game');
process.exit(process.exitCode ?? 0);
