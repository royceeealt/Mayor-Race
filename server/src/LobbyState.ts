import { Schema, MapSchema, type } from "@colyseus/schema";

export class LobbyPlayer extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("string") avatar = "frog";
  @type("boolean") connected = true;
  @type("boolean") ready = false;
}

export class LobbyState extends Schema {
  @type("string") code = "";
  @type("string") hostId = "";
  @type("string") phase = "LOBBY";
  @type("number") maxPlayers = 12;
  @type({ map: LobbyPlayer }) players = new MapSchema<LobbyPlayer>();
}