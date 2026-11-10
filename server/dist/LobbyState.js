var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Schema, MapSchema, type } from "@colyseus/schema";
export class LobbyPlayer extends Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.name = "";
        this.avatar = "frog";
        this.connected = true;
        this.ready = false;
    }
}
__decorate([
    type("string")
], LobbyPlayer.prototype, "id", void 0);
__decorate([
    type("string")
], LobbyPlayer.prototype, "name", void 0);
__decorate([
    type("string")
], LobbyPlayer.prototype, "avatar", void 0);
__decorate([
    type("boolean")
], LobbyPlayer.prototype, "connected", void 0);
__decorate([
    type("boolean")
], LobbyPlayer.prototype, "ready", void 0);
export class LobbyState extends Schema {
    constructor() {
        super(...arguments);
        this.code = "";
        this.hostId = "";
        this.phase = "LOBBY";
        this.maxPlayers = 12;
        this.phaseEndsAt = 0;
        this.round = 0;
        this.totalRounds = 3;
        this.players = new MapSchema();
    }
}
__decorate([
    type("string")
], LobbyState.prototype, "code", void 0);
__decorate([
    type("string")
], LobbyState.prototype, "hostId", void 0);
__decorate([
    type("string")
], LobbyState.prototype, "phase", void 0);
__decorate([
    type("number")
], LobbyState.prototype, "maxPlayers", void 0);
__decorate([
    type("number")
], LobbyState.prototype, "phaseEndsAt", void 0);
__decorate([
    type("number")
], LobbyState.prototype, "round", void 0);
__decorate([
    type("number")
], LobbyState.prototype, "totalRounds", void 0);
__decorate([
    type({ map: LobbyPlayer })
], LobbyState.prototype, "players", void 0);
