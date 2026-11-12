import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ROOM_NAME } from '@mayor-race/shared';
import { MayorRoom } from './rooms/MayorRoom.js';

const port = Number(process.env.PORT ?? 2567);

const server = new Server({
  transport: new WebSocketTransport(),
  express: (app) => {
    // Hello-world / uptime check for the host (Railway, Fly.io, Render).
    app.get('/health', (_req: unknown, res: { json: (b: unknown) => void }) => {
      res.json({ ok: true, game: 'mayor-race', time: new Date().toISOString() });
    });
  },
});

server.define(ROOM_NAME, MayorRoom);
await server.listen(port);
console.log(`Mayor Race server listening on :${port}`);
