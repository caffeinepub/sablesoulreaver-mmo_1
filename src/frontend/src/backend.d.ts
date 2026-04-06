import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Player {
    hp: bigint;
    id: Principal;
    upgradeLevel: bigint;
    username: string;
    resources: {
        food: bigint;
        wood: bigint;
        stone: bigint;
    };
    posX: number;
    posY: number;
    troops: Troops;
    baseHp: bigint;
    shieldCooldownUntil: Time;
    level: bigint;
    shieldActive: boolean;
    wallHp: bigint;
    lastSeen: Time;
    serverId: bigint;
}
export interface Troops {
    tanks: bigint;
    jets: bigint;
    soldiers: bigint;
}
export interface BossNPC {
    baseHp: bigint;
    shieldCooldownUntil: Time;
    wallHp: bigint;
    serverId: bigint;
    defeated: boolean;
}
export type Time = bigint;
export interface ServerInfo {
    name: string;
    playerCount: bigint;
    isOnline: boolean;
}
export interface backendInterface {
    attackBossNPC(serverId: bigint, damage: bigint): Promise<void>;
    claimTerritory(serverId: bigint, cellX: bigint, cellY: bigint, clanId: bigint): Promise<void>;
    createClan(name: string, color: string, serverId: bigint): Promise<bigint>;
    getBossNPC(serverId: bigint): Promise<BossNPC>;
    getPlayer(playerId: Principal): Promise<Player>;
    getPlayersOnServer(serverId: bigint): Promise<Array<Player>>;
    getServerInfo(serverId: bigint): Promise<ServerInfo>;
    healPlayerWall(wallHpAmount: bigint): Promise<void>;
    initializeResourceFields(serverId: bigint): Promise<void>;
    joinClan(clanId: bigint): Promise<void>;
    recordAttack(attackerUsername: string, attackerClanName: string, targetId: bigint, targetType: string, serverId: bigint, damage: bigint): Promise<void>;
    registerOrUpdatePlayer(username: string, serverId: bigint, posX: number, posY: number): Promise<void>;
    sendChatMessage(serverId: bigint, username: string, content: string): Promise<void>;
    setPlayerShield(playerId: Principal, active: boolean): Promise<void>;
    updateTroops(troops: Troops): Promise<void>;
    upgradeBase(upgradeType: string): Promise<void>;
}
