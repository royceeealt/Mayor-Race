import { Server } from "colyseus";
import { GameRoom } from "./GameRoom.js";

const port = Number(process.env.PORT) || 2567;

const gameServer = new Server();
gameServer.define("game", GameRoom);

gameServer.listen(port).then(() => {
  console.log(`Mayor Race server listening on ws://localhost:${port}`);
});