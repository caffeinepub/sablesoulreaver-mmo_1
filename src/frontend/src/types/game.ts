export interface TroopCounts {
  soldiers: number;
  tanks: number;
  jets: number;
}

export interface UpgradeState {
  baseHp: number;
  wallHp: number;
  trainingSpeed: number;
  troopCap: number;
  attackPower: number;
}

export interface TeleportCharge {
  id: number;
  cooldownUntil: number;
}

export interface TrainingEntry {
  type: "soldiers" | "tanks" | "jets";
  count: number;
  completesAt: number;
}

export interface HealingEntry {
  id: string;
  troops: number;
  completesAt: number;
}

export interface BossState {
  baseHp: number;
  wallHp: number;
  maxBaseHp: number;
  maxWallHp: number;
  shieldCooldownUntil: number;
  defeated: boolean;
  shieldActive?: boolean;
}

export interface AttackFlash {
  id: string;
  x: number;
  y: number;
  startTime: number;
}

export interface NuclearBlast {
  id: string;
  x: number;
  y: number;
  startTime: number;
}

export interface ClanChatMessage {
  id: string;
  username: string;
  clanId: string;
  content: string;
  imageDataUrl?: string;
  timestamp: number;
}

export interface GamePlayer {
  id: string;
  username: string;
  serverId: number;
  posX: number;
  posY: number;
  hp: number;
  maxHp: number;
  level: number;
  clanId?: string;
  resources: { wood: number; stone: number; food: number };
  gold?: number;
  troops?: TroopCounts;
  upgradeLevel?: number;
  shieldActive?: boolean;
  wallHp?: number;
  maxWallHp?: number;
  maxBaseHp?: number;
  basePhotoUrl?: string;
  // Hacker unit fields
  hackerOwned?: boolean;
  hackerIsHacking?: boolean;
  hackerTargetId?: string | null;
  hackerStartTime?: number | null;
  shieldHackedUntil?: number | null;
  // K/D tracking
  kills?: number;
  deaths?: number;
  // Spy Planes
  spyPlanes?: number;
  // Anti-Air Guns (max 3)
  antiAirCount?: number;
}

export interface ClanUpgrades {
  defenseBonus: number;
  attackBonus: number;
  trainingBonus: number;
  troopCap: number;
}

export interface LocalClan {
  id: string;
  name: string;
  color: string;
  serverId: number;
  memberUsernames: string[];
  leaderUsername: string;
  motd?: string;
  clanPoints?: number;
  clanUpgrades?: ClanUpgrades;
  hqPos?: { x: number; y: number };
  hqHp?: number;
  hqWallHp?: number;
  hqDestroyedAt?: number;
  hqTeleportsToday?: number;
  hqLastTeleportDay?: number;
  memberRanks?: Record<string, string>;
  declaredWars?: string[];
  clanShieldActive?: boolean;
  clanShieldActivatedAt?: number | null;
  clanShieldCooldownUntil?: number | null;
  // Atom Bomb
  atomBombsUsed?: number; // 0, 1, or 2 — max 2 total
  atomBombLastUsed?: number; // Unix ms timestamp of last successful launch
}

export interface AtomBomb {
  id: string;
  sourceClanId: string;
  sourceClanName: string;
  targetPlayerId: string;
  targetPlayerName: string;
  x: number; // current bomb position (map coords)
  y: number;
  targetX: number; // current target position (updates if player moves)
  targetY: number;
  launchX: number; // launch origin for trail
  launchY: number;
  launchedAt: number; // timestamp
  exploded: boolean;
  explodedAt?: number;
}

export interface TerritoryCell {
  cellX: number;
  cellY: number;
  clanId: string;
  occupyingTroops?: { username: string; clanId: string; count: number } | null;
}

export type ResourceType = "wood" | "stone" | "food" | "gold";

export interface ResourceField {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
  controlledByClanId?: string;
  guardStrength?: number;
  occupyingTroops?: { username: string; clanId: string; count: number } | null;
}

export interface ChatMessage {
  id: string;
  username: string;
  content: string;
  timestamp: number;
  serverId: number;
}

export interface AttackNotification {
  id: string;
  message: string;
  timestamp: number;
}

export type GameScreen = "username" | "server-select" | "game";

export const CLAN_COLORS = [
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#9B59B6",
  "#F39C12",
  "#1ABC9C",
  "#E91E63",
  "#FF9800",
];

export const WORLD_SIZE = 100000;
export const CELL_SIZE = 20;
export const GRID_SIZE = 50;

export interface GameSave {
  players: GamePlayer[];
  clans: LocalClan[];
  territory: TerritoryCell[];
  resources: ResourceField[];
  timestamp: number;
  serverId: number;
}

export interface MarchingArmy {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  attackerUsername: string;
  attackerColor: string;
  targetType: "base" | "resource" | "boss" | "hq" | "return";
  targetLabel: string;
  unitType?: "soldiers" | "tanks" | "jets" | "mixed";
  isReturn?: boolean;
  marchType?: "attack" | "reinforce" | "return";
}

export interface NPCBase {
  id: string;
  memberName: string;
  posX: number;
  posY: number;
  hp: number;
  maxHp: number;
  wallHp: number;
  maxWallHp: number;
  troops: number;
  isRetaliating?: boolean;
}

export interface DragonNPC {
  id: string;
  name: string;
  posX: number;
  posY: number;
  hp: number;
  maxHp: number;
  armorHp: number;
  maxArmorHp: number;
  isAlive: boolean;
}

export interface NightThugState {
  active: boolean;
  targetPlayerId: string | null;
  targetUsername: string | null;
  posX: number;
  posY: number;
  raidProgress: number; // 0-1 (0=marching, approaching; 1=raid complete)
  despawning: boolean;
  spawnedAt: number;
  reachedAt: number | null; // timestamp when thugs reached base
}

export interface SpyPlane {
  id: string;
  ownerId: string;
  ownerUsername: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number; // radians, direction of travel
  launchedAt: number;
  active: boolean;
  expiresAt: number;
}

export interface AttackLogEntry {
  id: string;
  attackerName: string;
  targetName: string;
  targetX: number;
  targetY: number;
  timestamp: number;
}
