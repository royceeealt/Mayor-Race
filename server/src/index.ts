import { Server } from "colyseus";

const port = Number(process.env.PORT) || 2567;

const gameServer = new Server();

gameServer.listen(port).then(() => {
  console.log(`Mayor Race server listening on ws://localhost:${port}`);
});