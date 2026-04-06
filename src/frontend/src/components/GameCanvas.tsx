import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type {
  AtomBomb,
  AttackFlash,
  BossState,
  GamePlayer,
  HealingEntry,
  LocalClan,
  MarchingArmy,
  NuclearBlast,
  ResourceField,
  SpyPlane,
  TerritoryCell,
} from "../types/game";
import { CELL_SIZE, WORLD_SIZE } from "../types/game";
import type { DragonNPC, NPCBase, NightThugState } from "../types/game";

const BOSS_X = 50000;
const BOSS_Y = 50000;

// ── Mountains terrain
const MOUNTAINS: { x: number; y: number; baseSize: number }[] = [
  { x: 8000, y: 12000, baseSize: 600 },
  { x: 22000, y: 5000, baseSize: 400 },
  { x: 35000, y: 18000, baseSize: 800 },
  { x: 48000, y: 8000, baseSize: 350 },
  { x: 62000, y: 14000, baseSize: 650 },
  { x: 75000, y: 6000, baseSize: 500 },
  { x: 88000, y: 20000, baseSize: 700 },
  { x: 5000, y: 35000, baseSize: 450 },
  { x: 18000, y: 42000, baseSize: 600 },
  { x: 30000, y: 28000, baseSize: 350 },
  { x: 44000, y: 38000, baseSize: 750 },
  { x: 58000, y: 25000, baseSize: 500 },
  { x: 70000, y: 40000, baseSize: 400 },
  { x: 82000, y: 32000, baseSize: 650 },
  { x: 92000, y: 45000, baseSize: 300 },
  { x: 10000, y: 58000, baseSize: 550 },
  { x: 25000, y: 65000, baseSize: 700 },
  { x: 38000, y: 52000, baseSize: 400 },
  { x: 52000, y: 68000, baseSize: 600 },
  { x: 65000, y: 55000, baseSize: 450 },
  { x: 78000, y: 70000, baseSize: 800 },
  { x: 90000, y: 60000, baseSize: 350 },
  { x: 15000, y: 80000, baseSize: 650 },
  { x: 45000, y: 85000, baseSize: 500 },
  { x: 72000, y: 88000, baseSize: 400 },
];

export interface TornadoRenderState {
  warning: boolean;
  pathStartX: number;
  pathStartY: number;
  pathEndX: number;
  pathEndY: number;
  pathWidth: number;
  posX: number;
  posY: number;
  progress: number;
}

export interface GameCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

interface Props {
  players: GamePlayer[];
  myPlayer: GamePlayer | null;
  clans: LocalClan[];
  territory: TerritoryCell[];
  resources: ResourceField[];
  phase: "day" | "night";
  attackMode: boolean;
  onAttackBase: (player: GamePlayer) => void;
  onAttackResource: (field: ResourceField) => void;
  onAttackBoss?: () => void;
  onCameraChange?: (x: number, y: number) => void;
  externalCamera?: { x: number; y: number } | null;
  attackFlashes: AttackFlash[];
  nuclearBlasts: NuclearBlast[];
  bossNPC: BossState | null;
  myShieldActive: boolean;
  healingQueue: HealingEntry[];
  marchingArmies: MarchingArmy[];
  onHQTap?: (clan: LocalClan) => void;
  onAttackClanHQ?: (clanId: string, damage: number) => void;
  onPlayerTap?: (player: GamePlayer) => void;
  onOwnBaseTap?: () => void;
  attackingTargets?: Set<string>;
  npcBases?: NPCBase[];
  onAttackNPCBase?: (base: NPCBase) => void;
  dragons?: DragonNPC[];
  onAttackDragon?: (dragon: DragonNPC) => void;
  dragonModeActive?: boolean;
  hasClanDragon?: boolean;
  hasSpecialForces?: boolean;
  hasHacker?: boolean;
  sfServerId?: number;
  onDragonAutoAttack?: (
    targetType: "player" | "npc" | "npcBase",
    targetId: string,
    damage: number,
  ) => void;
  nightThugs?: NightThugState;
  myShieldHackedUntil?: number | null;
  pondTrolls?: Array<{
    id: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    alive: boolean;
    respawnAt?: number;
  }>;
  onTrollTap?: (trollId: string) => void;
  skyJets?: Array<{
    id: string;
    x: number;
    y: number;
    angle: number;
    progress: number;
    hasBomb: boolean;
    bombX?: number;
    bombY?: number;
    bombProgress?: number;
  }>;
  isRaining?: boolean;
  tornadoRender?: TornadoRenderState;
  tornadoDestruction?: {
    destroyedTreeIndices: number[];
    destroyedPondIndices: number[];
  };
  hasTornadoShelter?: boolean;
  onMapClick?: (worldX: number, worldY: number) => void;
  atomBombs?: AtomBomb[];
  activeSpyPlanes?: SpyPlane[];
  localUsername?: string;
  scoutMissions?: Array<{
    id: string;
    phase: "outbound" | "returning" | "complete" | "intercepted";
    startedAt: number;
    fromX: number;
    fromY: number;
    targetX: number;
    targetY: number;
    targetUsername: string;
  }>;
  disconnectedTiles?: Array<{ cellX: number; cellY: number }>;
  showDisconnectedTiles?: boolean;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Dirt terrain elements
const terrainRng = seededRandom(42);

// Tree clusters (canopy view from above)
export const TREES: { x: number; y: number; r: number }[] = [];
for (let i = 0; i < 45; i++) {
  TREES.push({
    x: terrainRng() * WORLD_SIZE,
    y: terrainRng() * WORLD_SIZE,
    r: 80 + terrainRng() * 250,
  });
}

// Water ponds
export const PONDS: { x: number; y: number; rx: number; ry: number }[] = [];
for (let i = 0; i < 10; i++) {
  PONDS.push({
    x: 4000 + terrainRng() * (WORLD_SIZE - 8000),
    y: 4000 + terrainRng() * (WORLD_SIZE - 8000),
    rx: 300 + terrainRng() * 700,
    ry: 150 + terrainRng() * 400,
  });
}

// Dirt roads (series of waypoints connecting across map)
const ROADS: Array<Array<{ x: number; y: number }>> = [];
const roadRng = seededRandom(77);
for (let r = 0; r < 6; r++) {
  const pts: Array<{ x: number; y: number }> = [];
  let rx2 = roadRng() * WORLD_SIZE;
  let ry2 = roadRng() * WORLD_SIZE;
  for (let seg = 0; seg < 6; seg++) {
    pts.push({ x: rx2, y: ry2 });
    rx2 += (roadRng() - 0.5) * 15000;
    ry2 += (roadRng() - 0.5) * 15000;
    rx2 = Math.max(0, Math.min(WORLD_SIZE, rx2));
    ry2 = Math.max(0, Math.min(WORLD_SIZE, ry2));
  }
  ROADS.push(pts);
}

// Dirt patch texture positions
const DIRT_PATCHES: {
  x: number;
  y: number;
  rx: number;
  ry: number;
  dark: boolean;
}[] = [];
for (let i = 0; i < 120; i++) {
  DIRT_PATCHES.push({
    x: terrainRng() * WORLD_SIZE,
    y: terrainRng() * WORLD_SIZE,
    rx: 150 + terrainRng() * 500,
    ry: 60 + terrainRng() * 200,
    dark: terrainRng() > 0.6,
  });
}

// ── Detailed base drawing ──────────────────────────────────────────────────────
function drawDetailedBase(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  size: number,
  color: string,
  upgradeLevel: number,
  _hasShield: boolean,
) {
  const half = size / 2;
  ctx.save();

  // Drop shadow for depth
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = size * 0.35;
  ctx.shadowOffsetX = size * 0.05;
  ctx.shadowOffsetY = size * 0.08;
  ctx.fillStyle = "#1e1a16";
  ctx.fillRect(sx - half, sy - half, size, size);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Outer stone wall with brick pattern
  const brickH = Math.max(3, size * 0.09);
  const brickW = brickH * 2.2;
  const wallRows = Math.ceil(size / brickH) + 1;
  for (let row = 0; row < wallRows; row++) {
    const offsetX = row % 2 === 0 ? 0 : brickW * 0.5;
    const wallY = sy - half + row * brickH;
    if (wallY > sy + half) break;
    const cols = Math.ceil((size + brickW) / brickW) + 2;
    for (let col = 0; col < cols; col++) {
      const wallX = sx - half + col * brickW - offsetX;
      const clampX = Math.max(sx - half, wallX + 0.8);
      const clampW = Math.min(brickW - 1.5, sx + half - clampX);
      const clampY = Math.max(sy - half, wallY + 0.4);
      const clampH = Math.min(brickH - 0.8, sy + half - clampY);
      if (clampW <= 0 || clampH <= 0) continue;
      const shade =
        (row + col) % 3 === 0
          ? "#4e4844"
          : (row + col) % 3 === 1
            ? "#3d3835"
            : "#454039";
      ctx.fillStyle = shade;
      ctx.fillRect(clampX, clampY, clampW, clampH);
    }
  }
  // Mortar lines
  ctx.strokeStyle = "#201e1b";
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.4;
  for (let row = 0; row <= wallRows; row++) {
    ctx.beginPath();
    ctx.moveTo(sx - half, sy - half + row * brickH);
    ctx.lineTo(sx + half, sy - half + row * brickH);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Inner courtyard — dark stone floor
  const innerSize = size * 0.6;
  const innerHalf = innerSize / 2;
  ctx.fillStyle = "#152a0e";
  ctx.fillRect(sx - innerHalf, sy - innerHalf, innerSize, innerSize);
  // Grass texture strips
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#2a6a18";
  for (let gi = 0; gi < 8; gi++) {
    ctx.fillRect(
      sx - innerHalf + (gi * innerSize) / 8,
      sy - innerHalf,
      innerSize / 16,
      innerSize,
    );
  }
  ctx.globalAlpha = 1;

  // Central keep
  const keepW = size * 0.26;
  const keepH = size * 0.36;
  ctx.fillStyle = "#302c28";
  ctx.fillRect(sx - keepW / 2, sy - keepH / 2, keepW, keepH);
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = color;
  ctx.fillRect(sx - keepW / 2, sy - keepH / 2, keepW, keepH);
  ctx.globalAlpha = 1;
  // Keep shadow top
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(sx - keepW / 2, sy - keepH / 2, keepW, keepH * 0.22);
  // Keep crenellations
  const creW = keepW / 5;
  const creH = Math.max(2, keepH * 0.09);
  ctx.fillStyle = "#3a3530";
  for (let ci = 0; ci < 5; ci++) {
    if (ci % 2 === 0) {
      ctx.fillRect(
        sx - keepW / 2 + ci * creW,
        sy - keepH / 2 - creH,
        creW - 1,
        creH,
      );
    }
  }

  // Corner towers — circular with conical tops
  const towerR = Math.max(3, size * 0.1);
  const towerOffset = half - towerR * 0.8;
  const towers: [number, number][] = [
    [sx - towerOffset, sy - towerOffset],
    [sx + towerOffset, sy - towerOffset],
    [sx - towerOffset, sy + towerOffset],
    [sx + towerOffset, sy + towerOffset],
  ];
  for (const [tx, ty] of towers) {
    // Tower body circle
    ctx.fillStyle = "#4a4440";
    ctx.beginPath();
    ctx.arc(tx, ty, towerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx, ty, towerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Conical top
    ctx.fillStyle = "#22201c";
    ctx.beginPath();
    ctx.moveTo(tx, ty - towerR - towerR * 1.1);
    ctx.lineTo(tx - towerR, ty - towerR * 0.4);
    ctx.lineTo(tx + towerR, ty - towerR * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tx, ty - towerR - towerR * 1.1);
    ctx.lineTo(tx - towerR, ty - towerR * 0.4);
    ctx.lineTo(tx + towerR, ty - towerR * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // Lit window on tower
    ctx.fillStyle = "#FFD060";
    ctx.globalAlpha = 0.9;
    ctx.fillRect(tx - 1.5, ty - 2.5, 3, 4.5);
    ctx.globalAlpha = 1;
  }

  // Gate arch at bottom center
  const gateW = size * 0.13;
  const gateH = size * 0.16;
  ctx.fillStyle = "#0a0806";
  ctx.beginPath();
  ctx.rect(sx - gateW / 2, sy + half - gateH, gateW, gateH);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx, sy + half - gateH, gateW / 2, Math.PI, 0);
  ctx.fill();
  // Portcullis lines
  ctx.strokeStyle = "#1e1c18";
  ctx.lineWidth = 1;
  for (let gi = 1; gi < 3; gi++) {
    ctx.beginPath();
    ctx.moveTo(sx - gateW / 2 + gi * (gateW / 3), sy + half - gateH);
    ctx.lineTo(sx - gateW / 2 + gi * (gateW / 3), sy + half);
    ctx.stroke();
  }

  // Wall lit windows
  ctx.fillStyle = "#FFB840";
  ctx.globalAlpha = 0.82;
  const winPos: [number, number][] = [
    [sx - half * 0.56, sy - half * 0.28],
    [sx + half * 0.56, sy - half * 0.28],
    [sx - half * 0.56, sy + half * 0.16],
    [sx + half * 0.56, sy + half * 0.16],
    [sx - half * 0.18, sy - half * 0.56],
    [sx + half * 0.18, sy - half * 0.56],
  ];
  for (const [wx, wy] of winPos) {
    ctx.fillRect(wx - 1.5, wy - 2, 3, 4);
  }
  // Keep windows
  ctx.fillStyle = "#FFD070";
  ctx.fillRect(sx - 2, sy - keepH / 2 + keepH * 0.38, 4, 5);
  ctx.fillRect(sx - keepW * 0.26, sy, 3, 4.5);
  ctx.fillRect(sx + keepW * 0.18, sy, 3, 4.5);
  ctx.globalAlpha = 1;

  // Top battlements at upgrade 5+
  if (upgradeLevel >= 5) {
    ctx.fillStyle = "#3a3530";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(
        sx - half + i * (size / 5) + 1,
        sy - half - 3,
        size / 5 - 2,
        4,
      );
    }
  }

  ctx.restore();
}

// ── Clan HQ drawing ──────────────────────────────────────────────────────────
function drawClanHQ(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  clan: LocalClan,
  screenScale: number,
) {
  const size = Math.max(40, 50 * screenScale);
  const half = size / 2;
  const hqHp = clan.hqHp || 0;
  const hqWallHp = clan.hqWallHp || 0;

  if (hqHp <= 0) {
    ctx.save();
    ctx.fillStyle = "#444";
    for (let i = 0; i < 8; i++) {
      const rx = sx - half * 0.5 + Math.sin(i * 2.1) * half * 0.8;
      const ry = sy - half * 0.3 + Math.cos(i * 1.7) * half * 0.5;
      ctx.fillRect(rx, ry, 8, 5);
    }
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(sx - half * 0.5, sy - half * 0.25, half, half * 0.6);
    ctx.fillStyle = "#666";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RUINS", sx, sy - half * 0.4);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.fillStyle = "#2a2a2a";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(sx - half, sy - half, size, size);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 0.5;
  for (let row = 1; row < 6; row++) {
    ctx.beginPath();
    ctx.moveTo(sx - half, sy - half + (size / 6) * row);
    ctx.lineTo(sx + half, sy - half + (size / 6) * row);
    ctx.stroke();
  }

  const yardSize = size * 0.7;
  ctx.fillStyle = "#0d2206";
  ctx.fillRect(sx - yardSize / 2, sy - yardSize / 2, yardSize, yardSize);

  const towerW = size * 0.4;
  const towerH = size * 0.55;
  ctx.fillStyle = `${clan.color}cc`;
  ctx.fillRect(sx - towerW / 2, sy - towerH / 2, towerW, towerH);

  ctx.fillStyle = clan.color;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(
      sx - towerW / 2 + i * (towerW / 4) + 1,
      sy - towerH / 2 - 5,
      towerW / 4 - 2,
      6,
    );
  }

  ctx.fillStyle = "rgba(255,204,0,0.5)";
  ctx.fillRect(sx - 4, sy - towerH / 2 + 6, 8, 10);

  const ctSize = size * 0.18;
  const ctOff = half - ctSize / 2;
  const cornerPositions: [number, number][] = [
    [sx - ctOff, sy - ctOff],
    [sx + ctOff, sy - ctOff],
    [sx - ctOff, sy + ctOff],
    [sx + ctOff, sy + ctOff],
  ];
  for (const [cpx, cpy] of cornerPositions) {
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(cpx - ctSize / 2, cpy - ctSize / 2, ctSize, ctSize);
    ctx.fillStyle = `${clan.color}aa`;
    ctx.fillRect(cpx - ctSize / 2, cpy - ctSize / 2, ctSize, ctSize * 0.35);
    ctx.fillStyle = clan.color;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(
        cpx - ctSize / 2 + i * (ctSize / 3) + 0.5,
        cpy - ctSize / 2 - 3,
        ctSize / 3 - 1,
        4,
      );
    }
  }

  ctx.fillStyle = "#0a0800";
  const gateW = size * 0.18;
  const gateH = size * 0.22;
  ctx.fillRect(sx - gateW / 2, sy + half - gateH, gateW, gateH);
  ctx.fillStyle = "#1a1400";
  ctx.beginPath();
  ctx.arc(sx, sy + half - gateH, gateW / 2, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = clan.color;
  ctx.beginPath();
  ctx.moveTo(sx, sy - towerH / 2 - 5);
  ctx.lineTo(sx + 10, sy - towerH / 2 - 1);
  ctx.lineTo(sx, sy - towerH / 2 + 3);
  ctx.fill();

  const barW = size * 1.1;
  const barX = sx - barW / 2;
  const barY = sy + half + 4;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(barX, barY, barW, 5);
  ctx.fillStyle = "#3366cc";
  ctx.fillRect(barX, barY, barW * (hqWallHp / 100000), 5);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(barX, barY + 6, barW, 5);
  const hpFrac = hqHp / 100000;
  ctx.fillStyle =
    hpFrac > 0.5 ? "#22cc22" : hpFrac > 0.25 ? "#cccc00" : "#cc2222";
  ctx.fillRect(barX, barY + 6, barW * hpFrac, 5);

  const fontSize = Math.max(10, 12 * screenScale);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillText(`\uD83C\uDFF0 ${clan.name}`, sx + 1, sy - half - 10);
  ctx.fillStyle = clan.color;
  ctx.fillText(`\uD83C\uDFF0 ${clan.name}`, sx, sy - half - 11);

  // ── 3D isometric depth panels (HQ) ──────────────────────────────
  {
    const depth3D = size * 0.28;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.moveTo(sx + half, sy - half);
    ctx.lineTo(sx + half + depth3D * 0.7, sy - half + depth3D * 0.5);
    ctx.lineTo(sx + half + depth3D * 0.7, sy + half + depth3D * 0.5);
    ctx.lineTo(sx + half, sy + half);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = clan.color;
    ctx.beginPath();
    ctx.moveTo(sx + half, sy - half);
    ctx.lineTo(sx + half + depth3D * 0.7, sy - half + depth3D * 0.5);
    ctx.lineTo(sx + half + depth3D * 0.7, sy + half + depth3D * 0.5);
    ctx.lineTo(sx + half, sy + half);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath();
    ctx.moveTo(sx - half, sy + half);
    ctx.lineTo(sx - half + depth3D * 0.7, sy + half + depth3D * 0.5);
    ctx.lineTo(sx + half + depth3D * 0.7, sy + half + depth3D * 0.5);
    ctx.lineTo(sx + half, sy + half);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(sx - half, sy - half);
    ctx.lineTo(sx + half, sy - half);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(
      sx + depth3D * 0.35,
      sy + half + depth3D * 0.5,
      half * 1.3,
      half * 0.35,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── DEV Banner drawing ──────────────────────────────────────────────────────
function drawDevBanner(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  now: number,
) {
  ctx.save();
  const pulse = 0.85 + 0.15 * Math.sin(now * 0.005);
  const bWidth = 52;
  const bHeight = 16;
  const bx = sx - bWidth / 2;
  const by = sy - 82;

  // Glow
  ctx.shadowColor = "#ff2200";
  ctx.shadowBlur = 12 * pulse;

  // Pill background
  ctx.fillStyle = "rgba(10,0,0,0.88)";
  ctx.beginPath();
  ctx.roundRect(bx, by, bWidth, bHeight, 8);
  ctx.fill();

  // Gold border
  const grad = ctx.createLinearGradient(bx, by, bx + bWidth, by);
  grad.addColorStop(0, `rgba(255,60,0,${pulse})`);
  grad.addColorStop(0.5, `rgba(255,220,0,${pulse})`);
  grad.addColorStop(1, `rgba(255,60,0,${pulse})`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bWidth, bHeight, 8);
  ctx.stroke();

  // DEV text
  ctx.shadowColor = "#ffdd00";
  ctx.shadowBlur = 8 * pulse;
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Outline
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.lineWidth = 2;
  ctx.strokeText("☢ DEV", sx, by + bHeight / 2);
  // Gold gradient fill
  const tGrad = ctx.createLinearGradient(sx - 20, by, sx + 20, by + bHeight);
  tGrad.addColorStop(0, "#ff4400");
  tGrad.addColorStop(0.5, "#ffd700");
  tGrad.addColorStop(1, "#ff4400");
  ctx.fillStyle = tGrad;
  ctx.fillText("☢ DEV", sx, by + bHeight / 2);

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Nuclear blast drawing ──────────────────────────────────────────────────
function drawNuclearBlast(
  ctx: CanvasRenderingContext2D,
  bsx: number,
  bsy: number,
  elapsed: number,
) {
  const BLAST_DURATION = 3000;
  const progress = Math.min(1, elapsed / BLAST_DURATION);
  const alpha = 1 - progress;

  ctx.save();

  // ── Ground flash (white → yellow → orange)
  if (progress < 0.15) {
    const fp = progress / 0.15;
    ctx.globalAlpha = (1 - fp) * 0.9;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bsx - 200, bsy - 200, 400, 400);
    ctx.globalAlpha = 1;
  }

  // ── Expanding shockwave rings
  const shockwaves = [
    { maxR: 180, delay: 0, color: "#ff8800" },
    { maxR: 220, delay: 0.05, color: "#ff4400" },
    { maxR: 140, delay: 0.1, color: "#ffcc00" },
  ];
  for (const sw of shockwaves) {
    const swProgress = Math.max(0, (progress - sw.delay) / (1 - sw.delay));
    if (swProgress <= 0) continue;
    const r = sw.maxR * swProgress;
    const swAlpha = (1 - swProgress) * alpha * 0.8;
    if (swAlpha <= 0) continue;
    try {
      const g = ctx.createRadialGradient(bsx, bsy, r * 0.8, bsx, bsy, r);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(
        0.7,
        `${sw.color}${Math.floor(swAlpha * 180)
          .toString(16)
          .padStart(2, "0")}`,
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bsx, bsy, r, 0, Math.PI * 2);
      ctx.fill();
    } catch {
      /* ignore */
    }
  }

  // ── Fireball core
  if (progress < 0.6) {
    const fp = progress / 0.6;
    const fbR = 20 + 60 * fp;
    const fbAlpha = (1 - fp) * 0.95;
    try {
      const fbGrad = ctx.createRadialGradient(
        bsx,
        bsy - fbR * 0.3,
        0,
        bsx,
        bsy,
        fbR,
      );
      fbGrad.addColorStop(0, `rgba(255,255,255,${fbAlpha})`);
      fbGrad.addColorStop(0.3, `rgba(255,220,50,${fbAlpha * 0.9})`);
      fbGrad.addColorStop(0.7, `rgba(255,80,0,${fbAlpha * 0.7})`);
      fbGrad.addColorStop(1, "rgba(100,0,0,0)");
      ctx.fillStyle = fbGrad;
      ctx.beginPath();
      ctx.arc(bsx, bsy - fbR * 0.2, fbR, 0, Math.PI * 2);
      ctx.fill();
    } catch {
      /* ignore */
    }
  }

  // ── Mushroom stem
  if (progress > 0.1 && progress < 0.85) {
    const sp = (progress - 0.1) / 0.75;
    const stemH = 120 * sp;
    const stemAlpha = (1 - sp) * alpha * 0.8;
    try {
      const stemGrad = ctx.createLinearGradient(bsx, bsy, bsx, bsy - stemH);
      stemGrad.addColorStop(0, `rgba(80,40,0,${stemAlpha})`);
      stemGrad.addColorStop(1, `rgba(180,100,20,${stemAlpha * 0.5})`);
      ctx.fillStyle = stemGrad;
      ctx.beginPath();
      ctx.ellipse(
        bsx,
        bsy - stemH / 2,
        8 + 4 * sp,
        stemH / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } catch {
      /* ignore */
    }
  }

  // ── Mushroom cloud cap
  if (progress > 0.2) {
    const cp = (progress - 0.2) / 0.8;
    const capR = 30 + 80 * cp;
    const capY = bsy - 80 - 50 * cp;
    const capAlpha = Math.min(1, cp * 2) * alpha * 0.85;
    try {
      const capGrad = ctx.createRadialGradient(bsx, capY, 0, bsx, capY, capR);
      capGrad.addColorStop(0, `rgba(255,180,60,${capAlpha})`);
      capGrad.addColorStop(0.5, `rgba(180,80,20,${capAlpha * 0.8})`);
      capGrad.addColorStop(1, "rgba(60,20,0,0)");
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.ellipse(bsx, capY, capR, capR * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } catch {
      /* ignore */
    }
  }

  // ── ☢ symbol
  if (progress < 0.5) {
    const tp = progress / 0.5;
    ctx.globalAlpha = (1 - tp) * 0.9;
    ctx.font = `bold ${32 + 20 * tp}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("\u2622️", bsx, bsy - 10);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── Mountain drawing
function drawMountain(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  baseSize: number,
  zoom: number,
) {
  const bw = baseSize * zoom;
  const bh = bw * 0.65;
  ctx.save();
  // Drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = bw * 0.25;
  ctx.shadowOffsetX = bw * 0.04;
  ctx.shadowOffsetY = bw * 0.06;
  // Dark grey base triangle
  ctx.fillStyle = "#3a3a3a";
  ctx.beginPath();
  ctx.moveTo(sx - bw / 2, sy + bh * 0.5);
  ctx.lineTo(sx, sy - bh * 0.5);
  ctx.lineTo(sx + bw / 2, sy + bh * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Mid grey peak
  ctx.fillStyle = "#606060";
  ctx.beginPath();
  ctx.moveTo(sx - bw * 0.33, sy + bh * 0.08);
  ctx.lineTo(sx, sy - bh * 0.5);
  ctx.lineTo(sx + bw * 0.33, sy + bh * 0.08);
  ctx.closePath();
  ctx.fill();
  // Light grey upper highlight
  ctx.fillStyle = "#888888";
  ctx.beginPath();
  ctx.moveTo(sx - bw * 0.2, sy - bh * 0.1);
  ctx.lineTo(sx, sy - bh * 0.5);
  ctx.lineTo(sx + bw * 0.18, sy - bh * 0.08);
  ctx.closePath();
  ctx.fill();
  // White snow cap
  ctx.fillStyle = "#e8eaf0";
  ctx.beginPath();
  ctx.moveTo(sx - bw * 0.1, sy - bh * 0.3);
  ctx.lineTo(sx, sy - bh * 0.5);
  ctx.lineTo(sx + bw * 0.1, sy - bh * 0.3);
  ctx.closePath();
  ctx.fill();
  // Snow tip highlight
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(sx - bw * 0.04, sy - bh * 0.43);
  ctx.lineTo(sx, sy - bh * 0.5);
  ctx.lineTo(sx + bw * 0.04, sy - bh * 0.43);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const GameCanvas = forwardRef<GameCanvasHandle, Props>(
  function GameCanvas(
    {
      players,
      myPlayer,
      clans,
      territory,
      resources,
      phase,
      attackMode,
      onAttackBase,
      onAttackResource,
      onAttackBoss,
      onCameraChange,
      externalCamera,
      attackFlashes,
      nuclearBlasts,
      bossNPC,
      myShieldActive,
      healingQueue,
      marchingArmies,
      onHQTap,
      onAttackClanHQ,
      onPlayerTap,
      onOwnBaseTap,
      attackingTargets,
      npcBases,
      onAttackNPCBase,
      dragons,
      onAttackDragon,
      dragonModeActive,
      hasClanDragon,
      hasSpecialForces,
      hasHacker,
      sfServerId,
      onDragonAutoAttack,
      nightThugs,
      myShieldHackedUntil,
      pondTrolls,
      onTrollTap,
      skyJets,
      isRaining,
      tornadoRender,
      tornadoDestruction,
      hasTornadoShelter,
      onMapClick,
      atomBombs,
      activeSpyPlanes,
      localUsername,
      scoutMissions,
      disconnectedTiles,
      showDisconnectedTiles,
    }: Props,
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Start camera near world center
    const cameraRef = useRef({
      x: WORLD_SIZE / 2 - 400,
      y: WORLD_SIZE / 2 - 300,
      zoom: 1,
    });
    const pinchRef = useRef({ active: false, lastDist: 0 });
    const dragRef = useRef({
      active: false,
      lastX: 0,
      lastY: 0,
      startX: 0,
      startY: 0,
      moved: false,
    });
    const photoCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const dragonFireBeams = useRef<
      Array<{
        fromX: number;
        fromY: number;
        toX: number;
        toY: number;
        startTime: number;
      }>
    >([]);
    const dragonFloatingDamage = useRef<
      Array<{ x: number; y: number; startTime: number; text: string }>
    >([]);
    const stateRef = useRef<{
      players: typeof players;
      myPlayer: typeof myPlayer;
      clans: typeof clans;
      territory: typeof territory;
      resources: typeof resources;
      phase: typeof phase;
      attackMode: typeof attackMode;
      attackFlashes: typeof attackFlashes;
      nuclearBlasts: typeof nuclearBlasts;
      bossNPC: typeof bossNPC;
      myShieldActive: typeof myShieldActive;
      healingQueue: typeof healingQueue;
      marchingArmies: typeof marchingArmies;
      attackingTargets: Set<string> | undefined;
      npcBases: NPCBase[] | undefined;
      dragons: DragonNPC[] | undefined;
      _photoCache: Map<string, HTMLImageElement>;
      dragonModeActive: boolean | undefined;
      hasClanDragon: boolean | undefined;
      hasSpecialForces: boolean | undefined;
      hasHacker: boolean | undefined;
      sfServerId: number | undefined;
      nightThugs: NightThugState | undefined;
      myShieldHackedUntil: number | null | undefined;
      pondTrolls: Props["pondTrolls"];
      skyJets: Props["skyJets"];
      isRaining: boolean | undefined;
      tornadoRender: TornadoRenderState | undefined;
      tornadoDestruction: Props["tornadoDestruction"];
      hasTornadoShelter: boolean | undefined;
      atomBombs: AtomBomb[] | undefined;
      activeSpyPlanes: SpyPlane[] | undefined;
      localUsername: string | undefined;
      scoutMissions: Props["scoutMissions"];
      disconnectedTiles: Props["disconnectedTiles"];
      showDisconnectedTiles: boolean | undefined;
    }>({
      players,
      myPlayer,
      clans,
      territory,
      resources,
      phase,
      attackMode,
      attackFlashes,
      nuclearBlasts,
      bossNPC,
      myShieldActive,
      healingQueue,
      marchingArmies,
      attackingTargets: attackingTargets,
      _photoCache: photoCache.current,
      npcBases: npcBases,
      dragons: dragons,
      dragonModeActive: dragonModeActive,
      hasClanDragon: hasClanDragon,
      hasSpecialForces: hasSpecialForces,
      hasHacker: hasHacker,
      sfServerId: sfServerId,
      nightThugs: nightThugs,
      myShieldHackedUntil: myShieldHackedUntil,
      pondTrolls: pondTrolls,
      skyJets: skyJets,
      isRaining: undefined,
      tornadoRender: undefined,
      tornadoDestruction: undefined,
      hasTornadoShelter: undefined,
      atomBombs: atomBombs,
      activeSpyPlanes: activeSpyPlanes,
      localUsername: localUsername,
      scoutMissions: scoutMissions,
      disconnectedTiles: disconnectedTiles,
      showDisconnectedTiles: showDisconnectedTiles,
    });
    const rafRef = useRef<number>(0);

    useEffect(() => {
      stateRef.current = {
        players,
        myPlayer,
        clans,
        territory,
        resources,
        phase,
        attackMode,
        attackFlashes,
        nuclearBlasts,
        bossNPC,
        myShieldActive,
        healingQueue,
        marchingArmies,
        attackingTargets,
        npcBases,
        dragons,
        _photoCache: photoCache.current,
        dragonModeActive,
        hasClanDragon,
        hasSpecialForces,
        hasHacker,
        sfServerId,
        nightThugs,
        myShieldHackedUntil,
        pondTrolls,
        skyJets,
        isRaining,
        tornadoRender,
        tornadoDestruction,
        hasTornadoShelter,
        atomBombs,
        activeSpyPlanes,
        localUsername,
        scoutMissions,
        disconnectedTiles,
        showDisconnectedTiles,
      };
    }, [
      players,
      myPlayer,
      clans,
      territory,
      resources,
      phase,
      attackMode,
      attackFlashes,
      nuclearBlasts,
      bossNPC,
      myShieldActive,
      healingQueue,
      marchingArmies,
      attackingTargets,
      npcBases,
      dragons,
      dragonModeActive,
      hasClanDragon,
      hasSpecialForces,
      hasHacker,
      sfServerId,
      nightThugs,
      myShieldHackedUntil,
      pondTrolls,
      skyJets,
      isRaining,
      tornadoRender,
      tornadoDestruction,
      hasTornadoShelter,
      atomBombs,
      activeSpyPlanes,
      localUsername,
      scoutMissions,
      disconnectedTiles,
      showDisconnectedTiles,
    ]);

    // Load/update base photos into cache
    useEffect(() => {
      const allPlayers = [...players];
      if (myPlayer) allPlayers.push(myPlayer);
      for (const p of allPlayers) {
        if (p.basePhotoUrl && !photoCache.current.has(p.username)) {
          const img = new Image();
          img.src = p.basePhotoUrl;
          photoCache.current.set(p.username, img);
        }
      }
    }, [players, myPlayer]);

    useEffect(() => {
      if (externalCamera) {
        cameraRef.current = {
          ...externalCamera,
          zoom: cameraRef.current.zoom || 1,
        };
      }
    }, [externalCamera]);

    // Dragon auto-attack interval
    useEffect(() => {
      if (!dragonModeActive || !hasClanDragon) return;
      const DRAGON_RADIUS = 3000;
      const DRAGON_DAMAGE = 25000;
      const ATTACK_INTERVAL = 8000 + Math.random() * 2000;

      const interval = setInterval(() => {
        const state = stateRef.current;
        const mp = state.myPlayer;
        if (!mp || !state.dragonModeActive || !state.hasClanDragon) return;

        // Find my clan HQ position
        const myClan = state.clans.find((c) =>
          c.memberUsernames.includes(mp.username),
        );
        if (!myClan?.hqPos) return;
        const hqX = myClan.hqPos.x;
        const hqY = myClan.hqPos.y;
        const dragonX = hqX + 55;
        const dragonY = hqY - 25;

        // Find nearest enemy within radius
        let nearest: {
          x: number;
          y: number;
          id: string;
          type: "player" | "npc" | "npcBase";
        } | null = null;
        let minDist = DRAGON_RADIUS;

        for (const p of state.players) {
          if (p.username === mp.username) continue;
          const isClanMate = myClan.memberUsernames.includes(p.username);
          if (isClanMate) continue;
          const dist = Math.hypot(p.posX - hqX, p.posY - hqY);
          if (dist < minDist) {
            minDist = dist;
            nearest = { x: p.posX, y: p.posY, id: p.username, type: "player" };
          }
        }

        for (const npc of state.npcBases ?? []) {
          if (npc.hp <= 0) continue;
          const dist = Math.hypot(npc.posX - hqX, npc.posY - hqY);
          if (dist < minDist) {
            minDist = dist;
            nearest = { x: npc.posX, y: npc.posY, id: npc.id, type: "npcBase" };
          }
        }

        for (const dragon of state.dragons ?? []) {
          if (dragon.hp <= 0) continue;
          const dist = Math.hypot(dragon.posX - hqX, dragon.posY - hqY);
          if (dist < minDist) {
            minDist = dist;
            nearest = {
              x: dragon.posX,
              y: dragon.posY,
              id: dragon.id,
              type: "npc",
            };
          }
        }

        if (!nearest) return;

        // Spawn fire beam visual
        dragonFireBeams.current.push({
          fromX: dragonX,
          fromY: dragonY,
          toX: nearest.x,
          toY: nearest.y,
          startTime: Date.now(),
        });

        // Spawn floating damage text
        dragonFloatingDamage.current.push({
          x: nearest.x,
          y: nearest.y - 30,
          startTime: Date.now(),
          text: `🐉 -${DRAGON_DAMAGE.toLocaleString()}`,
        });

        // Clean up old beams/floaters
        const now2 = Date.now();
        dragonFireBeams.current = dragonFireBeams.current.filter(
          (b) => now2 - b.startTime < 1200,
        );
        dragonFloatingDamage.current = dragonFloatingDamage.current.filter(
          (d) => now2 - d.startTime < 2000,
        );

        // Notify parent
        onDragonAutoAttack?.(nearest.type, nearest.id, DRAGON_DAMAGE);
      }, ATTACK_INTERVAL);

      return () => clearInterval(interval);
    }, [dragonModeActive, hasClanDragon, onDragonAutoAttack]);

    const clampCamera = useCallback((canvas: HTMLCanvasElement) => {
      const cam = cameraRef.current;
      const dpr = window.devicePixelRatio || 1;
      const z = cam.zoom || 1;
      const maxX = Math.max(0, WORLD_SIZE - canvas.width / dpr / z);
      const maxY = Math.max(0, WORLD_SIZE - canvas.height / dpr / z);
      cam.x = Math.max(0, Math.min(cam.x, maxX));
      cam.y = Math.max(0, Math.min(cam.y, maxY));
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          cameraRef.current.zoom = Math.min(
            3,
            (cameraRef.current.zoom || 1) * 1.3,
          );
          const canvas = canvasRef.current;
          if (canvas) clampCamera(canvas);
        },
        zoomOut: () => {
          cameraRef.current.zoom = Math.max(
            0.02,
            (cameraRef.current.zoom || 1) / 1.3,
          );
          const canvas = canvasRef.current;
          if (canvas) clampCamera(canvas);
        },
        resetZoom: () => {
          cameraRef.current.zoom = 1;
          const canvas = canvasRef.current;
          if (canvas) clampCamera(canvas);
        },
      }),
      [clampCamera],
    );

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      const cx = cameraRef.current.x;
      const cy = cameraRef.current.y;
      const zoom = cameraRef.current.zoom || 1;
      const now = Date.now();
      const {
        players: ps,
        myPlayer: mp,
        clans: cl,
        territory: terr,
        resources: res,
        phase: ph,
        attackFlashes: flashes,
        nuclearBlasts: nukes,
        bossNPC: boss,
        myShieldActive: shieldOn,
        healingQueue: hq,
        marchingArmies: marches,
        attackingTargets: atkTargets,
        npcBases: npcList,
      } = stateRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);

      // ── Dirt ground background
      ctx.fillStyle = "#4A3020";
      ctx.fillRect(0, 0, W, H);
      const bgGrad = ctx.createRadialGradient(
        W * 0.5,
        H * 0.4,
        0,
        W * 0.5,
        H * 0.5,
        Math.max(W, H) * 0.8,
      );
      bgGrad.addColorStop(0, "rgba(90,60,30,0.3)");
      bgGrad.addColorStop(0.5, "rgba(0,0,0,0)");
      bgGrad.addColorStop(1, "rgba(20,10,5,0.35)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Dirt patches for texture variation
      for (const patch of DIRT_PATCHES) {
        const psx = (patch.x - cx) * zoom;
        const psy = (patch.y - cy) * zoom;
        if (
          psx < -(patch.rx + 10) ||
          psx > W + patch.rx + 10 ||
          psy < -(patch.ry + 10) ||
          psy > H + patch.ry + 10
        )
          continue;
        ctx.globalAlpha = 0.13;
        ctx.fillStyle = patch.dark ? "#2A1A0A" : "#6B4820";
        ctx.beginPath();
        ctx.ellipse(
          psx,
          psy,
          patch.rx * zoom,
          patch.ry * zoom,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── Dirt roads
      ctx.save();
      ctx.lineWidth = Math.max(4, 10 * zoom);
      ctx.strokeStyle = "#5C4832";
      ctx.globalAlpha = 0.7;
      for (const road of ROADS) {
        if (road.length < 2) continue;
        ctx.beginPath();
        const rp0 = road[0];
        ctx.moveTo((rp0.x - cx) * zoom, (rp0.y - cy) * zoom);
        for (let ri = 1; ri < road.length; ri++) {
          ctx.lineTo((road[ri].x - cx) * zoom, (road[ri].y - cy) * zoom);
        }
        ctx.stroke();
      }
      // Road center line
      ctx.lineWidth = Math.max(1, 2 * zoom);
      ctx.strokeStyle = "#7A6244";
      ctx.setLineDash([30 * zoom, 20 * zoom]);
      ctx.globalAlpha = 0.35;
      for (const road of ROADS) {
        if (road.length < 2) continue;
        ctx.beginPath();
        const rp0 = road[0];
        ctx.moveTo((rp0.x - cx) * zoom, (rp0.y - cy) * zoom);
        for (let ri = 1; ri < road.length; ri++) {
          ctx.lineTo((road[ri].x - cx) * zoom, (road[ri].y - cy) * zoom);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();

      // ── Tree clusters (canopy top-down view)
      for (let treeIdx = 0; treeIdx < TREES.length; treeIdx++) {
        const tree = TREES[treeIdx];
        const tsx = (tree.x - cx) * zoom;
        const tsy = (tree.y - cy) * zoom;
        const tr = tree.r * zoom;
        if (
          tsx < -(tr + 10) ||
          tsx > W + tr + 10 ||
          tsy < -(tr + 10) ||
          tsy > H + tr + 10
        )
          continue;
        const isDestroyedTree =
          stateRef.current.tornadoDestruction?.destroyedTreeIndices.includes(
            treeIdx,
          );
        if (isDestroyedTree) {
          // Draw charred debris instead
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = "#3A2200";
          ctx.beginPath();
          ctx.ellipse(tsx, tsy, tr * 0.9, tr * 0.6, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // Scattered charred debris circles
          const debrisRng = (treeIdx * 7 + 1) * 0.37;
          for (let d = 0; d < 6; d++) {
            const angle = (d / 6) * Math.PI * 2 + debrisRng;
            const dist = tr * (0.3 + ((d * 13) % 7) * 0.1);
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = d % 2 === 0 ? "#2A1500" : "#4A3000";
            ctx.beginPath();
            ctx.arc(
              tsx + Math.cos(angle) * dist,
              tsy + Math.sin(angle) * dist * 0.7,
              tr * 0.12,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
          // Crack lines
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = "#1A0A00";
          ctx.lineWidth = Math.max(1, tr * 0.04);
          ctx.beginPath();
          ctx.moveTo(tsx - tr * 0.3, tsy);
          ctx.lineTo(tsx + tr * 0.4, tsy + tr * 0.15);
          ctx.moveTo(tsx, tsy - tr * 0.25);
          ctx.lineTo(tsx - tr * 0.1, tsy + tr * 0.3);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else {
          // Shadow
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = "#0A0A05";
          ctx.beginPath();
          ctx.ellipse(
            tsx + tr * 0.12,
            tsy + tr * 0.12,
            tr,
            tr * 0.85,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.globalAlpha = 1;
          // Outer canopy
          ctx.fillStyle = "#2D5A1B";
          ctx.beginPath();
          ctx.arc(tsx, tsy, tr, 0, Math.PI * 2);
          ctx.fill();
          // Inner highlight
          const tGrad = ctx.createRadialGradient(
            tsx - tr * 0.2,
            tsy - tr * 0.25,
            0,
            tsx,
            tsy,
            tr,
          );
          tGrad.addColorStop(0, "rgba(80,160,40,0.55)");
          tGrad.addColorStop(0.45, "rgba(50,120,20,0.25)");
          tGrad.addColorStop(1, "rgba(10,40,5,0.55)");
          ctx.fillStyle = tGrad;
          ctx.beginPath();
          ctx.arc(tsx, tsy, tr, 0, Math.PI * 2);
          ctx.fill();
          // Center dark core
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = "#1A3A0A";
          ctx.beginPath();
          ctx.arc(tsx, tsy, tr * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // ── Water ponds
      for (let pondIdx = 0; pondIdx < PONDS.length; pondIdx++) {
        const pond = PONDS[pondIdx];
        const psx = (pond.x - cx) * zoom;
        const psy = (pond.y - cy) * zoom;
        const prx = pond.rx * zoom;
        const pry = pond.ry * zoom;
        if (
          psx < -(prx + 10) ||
          psx > W + prx + 10 ||
          psy < -(pry + 10) ||
          psy > H + pry + 10
        )
          continue;
        const isDestroyedPond =
          stateRef.current.tornadoDestruction?.destroyedPondIndices.includes(
            pondIdx,
          );
        if (isDestroyedPond) {
          // Draw dried cracked muddy patch
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = "#6B4A22";
          ctx.beginPath();
          ctx.ellipse(psx, psy, prx, pry, 0, 0, Math.PI * 2);
          ctx.fill();
          // Cracked mud texture overlay
          ctx.fillStyle = "#8B6030";
          ctx.beginPath();
          ctx.ellipse(psx, psy, prx * 0.75, pry * 0.75, 0.2, 0, Math.PI * 2);
          ctx.fill();
          // Crack lines
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = "#4A2E0A";
          ctx.lineWidth = Math.max(1, prx * 0.04);
          ctx.beginPath();
          ctx.moveTo(psx - prx * 0.5, psy - pry * 0.1);
          ctx.lineTo(psx + prx * 0.3, psy + pry * 0.2);
          ctx.lineTo(psx + prx * 0.5, psy - pry * 0.15);
          ctx.moveTo(psx - prx * 0.1, psy - pry * 0.5);
          ctx.lineTo(psx + prx * 0.05, psy + pry * 0.45);
          ctx.moveTo(psx - prx * 0.3, psy + pry * 0.3);
          ctx.lineTo(psx + prx * 0.2, psy - pry * 0.1);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else {
          // Pond shadow
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "#0A1A22";
          ctx.beginPath();
          ctx.ellipse(psx + 5, psy + 5, prx, pry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          // Pond body
          const pondGrad = ctx.createRadialGradient(
            psx - prx * 0.2,
            psy - pry * 0.2,
            0,
            psx,
            psy,
            Math.max(prx, pry),
          );
          pondGrad.addColorStop(0, "#4EB8CC");
          pondGrad.addColorStop(0.5, "#2A7A96");
          pondGrad.addColorStop(1, "#1A4E66");
          ctx.fillStyle = pondGrad;
          ctx.beginPath();
          ctx.ellipse(psx, psy, prx, pry, 0, 0, Math.PI * 2);
          ctx.fill();
          // Water shimmer
          ctx.globalAlpha = 0.2 + 0.1 * Math.sin(now * 0.002 + pond.x * 0.001);
          ctx.fillStyle = "#88DDEF";
          ctx.beginPath();
          ctx.ellipse(
            psx - prx * 0.2,
            psy - pry * 0.25,
            prx * 0.45,
            pry * 0.25,
            -0.3,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.globalAlpha = 1;
          // Pond edge
          ctx.strokeStyle = "rgba(80,180,210,0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(psx, psy, prx, pry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // ── Mountains (terrain layer, before bases)
      for (const mtn of MOUNTAINS) {
        const msx = (mtn.x - cx) * zoom;
        const msy = (mtn.y - cy) * zoom;
        const screenSize = mtn.baseSize * zoom;
        if (
          msx < -(screenSize + 10) ||
          msx > W + screenSize + 10 ||
          msy < -(screenSize + 10) ||
          msy > H + screenSize + 10
        )
          continue;
        drawMountain(ctx, msx, msy, mtn.baseSize, zoom);
      }

      // ── Subtle grid overlay showing claimable cells
      {
        // Draw if CELL_SIZE pixels ≥ 4px (always true at normal zoom levels)
        ctx.save();
        ctx.strokeStyle = "rgba(255, 200, 100, 0.08)";
        ctx.lineWidth = 0.5;
        const startCX = Math.floor(cx / CELL_SIZE) * CELL_SIZE;
        const startCY = Math.floor(cy / CELL_SIZE) * CELL_SIZE;
        for (let gx = startCX; gx < cx + W + CELL_SIZE; gx += CELL_SIZE) {
          const sx = (gx - cx) * zoom;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, H);
          ctx.stroke();
        }
        for (let gy = startCY; gy < cy + H + CELL_SIZE; gy += CELL_SIZE) {
          const sy = (gy - cy) * zoom;
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(W, sy);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Territory cells (clan color overlay)
      {
        // Build owned-cell sets per clan for border detection
        const clanOwnedSets = new Map<string, Set<string>>();
        for (const cell of terr) {
          if (!clanOwnedSets.has(cell.clanId))
            clanOwnedSets.set(cell.clanId, new Set());
          clanOwnedSets.get(cell.clanId)!.add(`${cell.cellX},${cell.cellY}`);
        }

        for (const cell of terr) {
          const clan = cl.find((c) => c.id === cell.clanId);
          if (!clan) continue;
          const wx = cell.cellX * CELL_SIZE;
          const wy = cell.cellY * CELL_SIZE;
          const csx = (wx - cx) * zoom;
          const csy = (wy - cy) * zoom;
          if (
            csx > W + CELL_SIZE ||
            csy > H + CELL_SIZE ||
            csx + CELL_SIZE < 0 ||
            csy + CELL_SIZE < 0
          )
            continue;

          const ownedSet = clanOwnedSets.get(cell.clanId)!;
          const isBorderTile =
            !ownedSet.has(`${cell.cellX - 1},${cell.cellY}`) ||
            !ownedSet.has(`${cell.cellX + 1},${cell.cellY}`) ||
            !ownedSet.has(`${cell.cellX},${cell.cellY - 1}`) ||
            !ownedSet.has(`${cell.cellX},${cell.cellY + 1}`);

          // Main fill – 0.45 alpha for clear visibility
          const isEnemyTile =
            stateRef.current.attackMode &&
            stateRef.current.myPlayer &&
            !clan.memberUsernames.includes(stateRef.current.myPlayer.username);
          ctx.globalAlpha = isEnemyTile ? 0.55 : 0.45;
          // Feature 5: Red tint enemy tiles in attack mode
          if (isEnemyTile) {
            ctx.fillStyle = "#ff2222";
            ctx.fillRect(csx, csy, CELL_SIZE * zoom, CELL_SIZE * zoom);
            ctx.globalAlpha = 0.3;
          }
          ctx.fillStyle = clan.color;
          ctx.fillRect(csx, csy, CELL_SIZE * zoom, CELL_SIZE * zoom);
          ctx.globalAlpha = 1;

          // Top-left highlight strip (3D raised look)
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.fillRect(csx, csy, CELL_SIZE * zoom, 2);
          ctx.fillRect(csx, csy, 2, CELL_SIZE * zoom);
          ctx.globalAlpha = 1;

          // Bottom-right shadow strip (3D depth)
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(csx, csy + CELL_SIZE * zoom - 2, CELL_SIZE * zoom, 2);
          ctx.fillRect(csx + CELL_SIZE * zoom - 2, csy, 2, CELL_SIZE * zoom);
          ctx.globalAlpha = 1;

          if (isBorderTile) {
            // Pulsing bright border for territory edge tiles
            const pulse = 0.75 + 0.25 * Math.sin(now * 0.002);
            ctx.strokeStyle = clan.color;
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.85 * pulse;
            ctx.strokeRect(
              csx + 1,
              csy + 1,
              CELL_SIZE * zoom - 2,
              CELL_SIZE * zoom - 2,
            );
            ctx.globalAlpha = 1;
          } else {
            // Inner border for non-edge tiles
            ctx.strokeStyle = clan.color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.85;
            ctx.strokeRect(
              csx + 0.5,
              csy + 0.5,
              CELL_SIZE * zoom - 1,
              CELL_SIZE * zoom - 1,
            );
            ctx.globalAlpha = 1;
          }

          // Feature 6: Render occupying troop indicator
          if (cell.occupyingTroops && cell.occupyingTroops.count > 0) {
            const troopX = csx + (CELL_SIZE * zoom) / 2;
            const troopY = csy + (CELL_SIZE * zoom) / 2;
            const occupierClan = cl.find(
              (c) => c.id === cell.occupyingTroops!.clanId,
            );
            const troopColor = occupierClan?.color || "#ffcc44";
            // Badge background
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.beginPath();
            ctx.arc(troopX, troopY, 7 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            // Colored border
            ctx.strokeStyle = troopColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(troopX, troopY, 7 * zoom, 0, Math.PI * 2);
            ctx.stroke();
            // Helmet emoji or troop count
            if (zoom > 0.5) {
              ctx.font = `${Math.max(7, 9 * zoom)}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = troopColor;
              ctx.fillText("🪖", troopX, troopY);
            }
          }
        }
      }

      // ── Feature 1: Territory War Overlay — flashing contested tiles ──────────
      {
        // Build set of contested tile coords from active attack marches
        const contestedTiles = new Set<string>();
        for (const march of marches) {
          if (
            march.targetType === "base" &&
            march.targetLabel?.startsWith("tile_")
          ) {
            // tile_cellX_cellY
            const parts = march.targetLabel.split("_");
            if (parts.length >= 3) {
              contestedTiles.add(`${parts[1]}_${parts[2]}`);
            }
          }
        }
        if (contestedTiles.size > 0) {
          // Flashing alpha using sin oscillation
          const flashAlpha = Math.max(0, Math.sin(now / 200)) * 0.7;
          if (flashAlpha > 0.01) {
            ctx.globalAlpha = flashAlpha;
            ctx.fillStyle = "rgba(255,60,0,1)";
            for (const cell of terr) {
              const key = `${cell.cellX}_${cell.cellY}`;
              if (!contestedTiles.has(key)) continue;
              const wx = cell.cellX * CELL_SIZE;
              const wy = cell.cellY * CELL_SIZE;
              const csx = (wx - cx) * zoom;
              const csy = (wy - cy) * zoom;
              if (
                csx > W + CELL_SIZE ||
                csy > H + CELL_SIZE ||
                csx + CELL_SIZE < 0 ||
                csy + CELL_SIZE < 0
              )
                continue;
              ctx.fillRect(csx, csy, CELL_SIZE * zoom, CELL_SIZE * zoom);
            }
            ctx.globalAlpha = 1;
          }
        }
      }

      // ── Disconnected territory tiles overlay ──────────────────────────────────
      {
        const dtiles = stateRef.current.disconnectedTiles;
        const showDT = stateRef.current.showDisconnectedTiles;
        if (showDT && dtiles && dtiles.length > 0) {
          const pulse = 0.4 + 0.4 * Math.sin(now / 300);
          for (const tile of dtiles) {
            const wx = tile.cellX * CELL_SIZE;
            const wy = tile.cellY * CELL_SIZE;
            const csx = (wx - cx) * zoom;
            const csy = (wy - cy) * zoom;
            if (
              csx > W + CELL_SIZE ||
              csy > H + CELL_SIZE ||
              csx + CELL_SIZE < 0 ||
              csy + CELL_SIZE < 0
            )
              continue;
            // Pulsing orange/red fill
            ctx.globalAlpha = pulse * 0.45;
            ctx.fillStyle = "rgba(255, 80, 0, 1)";
            ctx.fillRect(csx, csy, CELL_SIZE * zoom, CELL_SIZE * zoom);
            ctx.globalAlpha = 0.6 + pulse * 0.4;
            ctx.strokeStyle = "rgba(255, 50, 0, 1)";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              csx + 1,
              csy + 1,
              CELL_SIZE * zoom - 2,
              CELL_SIZE * zoom - 2,
            );
            ctx.globalAlpha = 1;
            // ⚠ warning label
            const fontSize = Math.max(8, CELL_SIZE * zoom * 0.6);
            ctx.font = `${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#fff";
            ctx.fillText(
              "⚠",
              csx + (CELL_SIZE * zoom) / 2,
              csy + (CELL_SIZE * zoom) / 2,
            );
          }
        }
      }

      // ── Visible map grid (2000-unit squares) + territory region labels
      {
        const GRID_SIZE = 2000; // map units per visible grid square
        const startGX = Math.floor(cx / GRID_SIZE) * GRID_SIZE;
        const startGY = Math.floor(cy / GRID_SIZE) * GRID_SIZE;

        // Build a quick lookup of territory clan per grid square
        // Each grid square covers (GRID_SIZE/CELL_SIZE)^2 territory cells
        const gridClanCount: Map<string, Map<string, number>> = new Map();
        for (const cell of terr) {
          const clan = cl.find((c) => c.id === cell.clanId);
          if (!clan) continue;
          const gx = Math.floor((cell.cellX * CELL_SIZE) / GRID_SIZE);
          const gy = Math.floor((cell.cellY * CELL_SIZE) / GRID_SIZE);
          const key = `${gx}_${gy}`;
          if (!gridClanCount.has(key)) gridClanCount.set(key, new Map());
          const counts = gridClanCount.get(key)!;
          counts.set(clan.color, (counts.get(clan.color) || 0) + 1);
        }

        // Determine dominant clan color per grid square
        const gridDominant: Map<string, { color: string; name: string }> =
          new Map();
        for (const [key, counts] of gridClanCount) {
          let best = "";
          let bestCount = 0;
          for (const [color, count] of counts) {
            if (count > bestCount) {
              bestCount = count;
              best = color;
            }
          }
          if (best) {
            const clan = cl.find((c) => c.color === best);
            gridDominant.set(key, { color: best, name: clan?.name ?? "" });
          }
        }

        // Draw grid lines
        ctx.save();
        ctx.strokeStyle = "rgba(255,230,160,0.18)";
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 8]);

        for (let gx = startGX; gx <= cx + W + GRID_SIZE; gx += GRID_SIZE) {
          const sx = (gx - cx) * zoom;
          if (sx < -2 || sx > W + 2) continue;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, H);
          ctx.stroke();
        }
        for (let gy = startGY; gy <= cy + H + GRID_SIZE; gy += GRID_SIZE) {
          const sy = (gy - cy) * zoom;
          if (sy < -2 || sy > H + 2) continue;
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(W, sy);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // Draw subtle glow on captured grid square borders + name labels
        for (let gx = startGX; gx <= cx + W + GRID_SIZE; gx += GRID_SIZE) {
          for (let gy = startGY; gy <= cy + H + GRID_SIZE; gy += GRID_SIZE) {
            const sx = (gx - cx) * zoom;
            const sy = (gy - cy) * zoom;
            if (
              sx > W + GRID_SIZE ||
              sy > H + GRID_SIZE ||
              sx + GRID_SIZE < 0 ||
              sy + GRID_SIZE < 0
            )
              continue;
            const gxi = Math.floor(gx / GRID_SIZE);
            const gyi = Math.floor(gy / GRID_SIZE);
            const info = gridDominant.get(`${gxi}_${gyi}`);
            if (!info) continue;

            // Glowing border for captured grid square
            ctx.strokeStyle = info.color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.45;
            ctx.strokeRect(
              sx + 1,
              sy + 1,
              GRID_SIZE * zoom - 2,
              GRID_SIZE * zoom - 2,
            );
            ctx.globalAlpha = 1;

            // Clan name label in center (only when not too zoomed out)
            if (GRID_SIZE > 80) {
              const centerX = sx + GRID_SIZE / 2;
              const centerY = sy + GRID_SIZE / 2;
              const abbrev = info.name.substring(0, 4).toUpperCase();
              ctx.font = "bold 10px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.globalAlpha = 0.55;
              ctx.fillStyle = "#1a0a00";
              ctx.lineWidth = 3;
              ctx.strokeStyle = "#1a0a00";
              ctx.strokeText(abbrev, centerX, centerY);
              ctx.fillStyle = info.color;
              ctx.fillText(abbrev, centerX, centerY);
              ctx.globalAlpha = 1;
            }
          }
        }
        ctx.restore();
      }

      // ── Resource fields
      for (const field of res) {
        const fsx = (field.x - cx) * zoom;
        const fsy = (field.y - cy) * zoom;

        const radius = field.type === "gold" ? 22 : 18;

        // ── 3D raised platform beneath each resource field ──────────────────
        {
          const platformDepth = radius * 0.6;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.beginPath();
          ctx.moveTo(fsx - radius, fsy + radius);
          ctx.lineTo(
            fsx - radius + platformDepth * 0.7,
            fsy + radius + platformDepth * 0.5,
          );
          ctx.lineTo(
            fsx + radius + platformDepth * 0.7,
            fsy + radius + platformDepth * 0.5,
          );
          ctx.lineTo(fsx + radius, fsy + radius);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.beginPath();
          ctx.moveTo(fsx + radius, fsy - radius);
          ctx.lineTo(
            fsx + radius + platformDepth * 0.7,
            fsy - radius + platformDepth * 0.5,
          );
          ctx.lineTo(
            fsx + radius + platformDepth * 0.7,
            fsy + radius + platformDepth * 0.5,
          );
          ctx.lineTo(fsx + radius, fsy + radius);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(fsx - radius, fsy - radius);
          ctx.lineTo(fsx + radius, fsy - radius);
          ctx.stroke();
        }

        if (field.type === "wood") {
          // Forest shrine: dark green bg
          ctx.fillStyle = "#122a0a";
          ctx.strokeStyle = "#2a5e14";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(fsx - radius, fsy - radius, radius * 2, radius * 2, 5);
          ctx.fill();
          ctx.stroke();
          // Tree shadow on ground
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "#0a1a04";
          ctx.beginPath();
          ctx.ellipse(fsx + 3, fsy + 7, 11, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          // Brown trunk
          ctx.fillStyle = "#5a3010";
          ctx.fillRect(fsx - 2.5, fsy - 2, 5, 12);
          // Darker inner trunk
          ctx.fillStyle = "#3a1e08";
          ctx.fillRect(fsx - 1, fsy - 2, 2, 12);
          // Canopy layers (bottom to top for painter order)
          // Bottom/back canopy — shadow tone
          ctx.fillStyle = "#1a4a0a";
          ctx.beginPath();
          ctx.arc(fsx, fsy - 4, 11, 0, Math.PI * 2);
          ctx.fill();
          // Mid left
          ctx.fillStyle = "#267a12";
          ctx.beginPath();
          ctx.arc(fsx - 6, fsy - 8, 8, 0, Math.PI * 2);
          ctx.fill();
          // Mid right
          ctx.fillStyle = "#267a12";
          ctx.beginPath();
          ctx.arc(fsx + 5, fsy - 7, 7, 0, Math.PI * 2);
          ctx.fill();
          // Top highlight
          ctx.fillStyle = "#38b020";
          ctx.beginPath();
          ctx.arc(fsx - 1, fsy - 11, 7, 0, Math.PI * 2);
          ctx.fill();
          // Highlight sheen on top-left of canopy
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = "#80ee50";
          ctx.beginPath();
          ctx.arc(fsx - 4, fsy - 13, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          // Label
          ctx.font = "bold 7px sans-serif";
          ctx.fillStyle = "#5aee33";
          ctx.textAlign = "center";
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 2;
          ctx.strokeText("LUMBER", fsx, fsy + radius + 10);
          ctx.fillText("LUMBER", fsx, fsy + radius + 10);
        } else if (field.type === "stone") {
          // Mountain quarry: dark gray bg
          ctx.fillStyle = "#1e1e1e";
          ctx.strokeStyle = "#4a4a4a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(fsx - radius, fsy - radius, radius * 2, radius * 2, 3);
          ctx.fill();
          ctx.stroke();
          // Boulder shadows
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = "#0a0a0a";
          const boulderShadows: [number, number, number, number][] = [
            [fsx + 2, fsy - 1, 10, 5],
            [fsx - 6, fsy + 6, 8, 4],
            [fsx + 9, fsy + 5, 8, 4],
            [fsx, fsy + 11, 12, 4],
          ];
          for (const [bx, by, bw, bh] of boulderShadows) {
            ctx.beginPath();
            ctx.ellipse(bx, by, bw, bh, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          // Boulder shapes with face shading
          const boulderDefs: [
            number,
            number,
            number,
            number,
            string,
            string,
          ][] = [
            [fsx, fsy - 4, 9, 7, "#787878", "#a8a8a8"],
            [fsx - 8, fsy + 3, 7, 5, "#686868", "#989898"],
            [fsx + 7, fsy + 2, 7, 6, "#707070", "#a0a0a0"],
            [fsx - 1, fsy + 8, 11, 5, "#606060", "#909090"],
          ];
          for (const [bx, by, bw, bh, darkCol, litCol] of boulderDefs) {
            // Dark face
            ctx.fillStyle = darkCol;
            ctx.beginPath();
            ctx.ellipse(bx, by, bw, bh, 0, 0, Math.PI * 2);
            ctx.fill();
            // Lit top face gradient
            const bGrad = ctx.createRadialGradient(
              bx - bw * 0.3,
              by - bh * 0.4,
              0,
              bx,
              by,
              bw,
            );
            bGrad.addColorStop(0, litCol);
            bGrad.addColorStop(0.6, darkCol);
            bGrad.addColorStop(1, "#383838");
            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.ellipse(bx, by, bw, bh, 0, 0, Math.PI * 2);
            ctx.fill();
            // Rim
            ctx.strokeStyle = "rgba(255,255,255,0.12)";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(bx, by, bw - 0.5, bh - 0.5, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Label
          ctx.font = "bold 7px sans-serif";
          ctx.fillStyle = "#aabbcc";
          ctx.textAlign = "center";
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 2;
          ctx.strokeText("QUARRY", fsx, fsy + radius + 10);
          ctx.fillText("QUARRY", fsx, fsy + radius + 10);
        } else if (field.type === "food") {
          // Farmland: earthy brown with green rows
          ctx.fillStyle = "#5a3a10";
          ctx.strokeStyle = "#8a6030";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(fsx - radius, fsy - radius, radius * 2, radius * 2, 3);
          ctx.fill();
          ctx.stroke();
          // Green field rows
          ctx.fillStyle = "#3a7a20";
          for (let ri = 0; ri < 3; ri++) {
            ctx.fillRect(fsx - radius + 3, fsy - 8 + ri * 6, radius * 2 - 6, 3);
          }
          // Wheat bundles (gold triangles)
          ctx.fillStyle = "#e8c840";
          for (let wi = -1; wi <= 1; wi++) {
            ctx.beginPath();
            ctx.moveTo(fsx + wi * 7, fsy - 10);
            ctx.lineTo(fsx + wi * 7 - 3, fsy - 2);
            ctx.lineTo(fsx + wi * 7 + 3, fsy - 2);
            ctx.closePath();
            ctx.fill();
          }
          // Fence posts on border
          ctx.fillStyle = "#7a5030";
          for (let fi = 0; fi < 4; fi++) {
            const angle = (fi / 4) * Math.PI * 2;
            const fx2 = fsx + Math.cos(angle) * (radius - 3);
            const fy2 = fsy + Math.sin(angle) * (radius - 3);
            ctx.fillRect(fx2 - 2, fy2 - 5, 4, 10);
          }
          // Label
          ctx.font = "bold 7px sans-serif";
          ctx.fillStyle = "#ffd060";
          ctx.textAlign = "center";
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 2;
          ctx.strokeText("FARM", fsx, fsy + radius + 10);
          ctx.fillText("FARM", fsx, fsy + radius + 10);
        } else if (field.type === "gold") {
          // Gold Vault: pulsing treasure chest
          const goldPulse = 0.7 + 0.3 * Math.sin(now * 0.004);
          ctx.shadowColor = "#ffd700";
          ctx.shadowBlur = 20 * goldPulse;
          // Starburst rays
          ctx.save();
          ctx.translate(fsx, fsy);
          ctx.strokeStyle = `rgba(255,220,0,${0.3 * goldPulse})`;
          ctx.lineWidth = 2;
          for (let ri = 0; ri < 8; ri++) {
            const rayAngle = (ri / 8) * Math.PI * 2 + now * 0.001;
            ctx.beginPath();
            ctx.moveTo(
              Math.cos(rayAngle) * radius * 0.6,
              Math.sin(rayAngle) * radius * 0.6,
            );
            ctx.lineTo(
              Math.cos(rayAngle) * (radius + 8),
              Math.sin(rayAngle) * (radius + 8),
            );
            ctx.stroke();
          }
          ctx.restore();
          // Chest body
          ctx.fillStyle = "#7a4a10";
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(fsx - 14, fsy - 6, 28, 18, 3);
          ctx.fill();
          ctx.stroke();
          // Chest lid
          ctx.fillStyle = "#5a3008";
          ctx.beginPath();
          ctx.roundRect(fsx - 14, fsy - 14, 28, 10, 3);
          ctx.fill();
          ctx.stroke();
          // Gold trim band
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(fsx - 14, fsy - 8, 28, 3);
          // Gold coins stacked on top
          for (let ci = 0; ci < 3; ci++) {
            ctx.fillStyle = `rgba(255,200,0,${0.7 + 0.3 * goldPulse})`;
            ctx.beginPath();
            ctx.ellipse(
              fsx - 5 + ci * 5,
              fsy - 18 - ci * 2,
              5,
              3,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.strokeStyle = "#aa8800";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
          // Label
          ctx.font = "bold 8px sans-serif";
          ctx.fillStyle = "#ffd700";
          ctx.textAlign = "center";
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 2;
          ctx.strokeText("GOLD VAULT", fsx, fsy + radius + 12);
          ctx.fillText("GOLD VAULT", fsx, fsy + radius + 12);
        }

        // Clan control ring
        if (field.controlledByClanId) {
          const cc = cl.find((c) => c.id === field.controlledByClanId);
          if (cc) {
            ctx.strokeStyle = cc.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(fsx, fsy, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // ── NPC guard indicator
        const guardStr = field.guardStrength || 0;
        if (guardStr > 0) {
          const maxGuard = field.type === "gold" ? 20000 : 1000;
          const guardPct = Math.min(1, guardStr / maxGuard);
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(fsx - 18, fsy - radius - 12, 36, 5);
          ctx.fillStyle = `rgba(${Math.floor(255 * (1 - guardPct))},${Math.floor(80 * guardPct)},0,0.9)`;
          ctx.fillRect(fsx - 18, fsy - radius - 12, 36 * guardPct, 5);
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("☠️", fsx, fsy - radius - 22);
          ctx.font = "bold 7px sans-serif";
          ctx.fillStyle = "#ff4444";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(`⚠ ${guardStr}`, fsx, fsy - radius - 15);
        }

        // ── Occupying troops indicator
        const ot = field.occupyingTroops;
        if (ot && ot.count > 0) {
          const occupierClan = cl.find((c) => c.id === ot.clanId);
          const troopColor = occupierClan?.color || "#ffaa00";
          for (let ti = 0; ti < 5; ti++) {
            const angle = (ti / 5) * Math.PI * 2 - Math.PI / 2;
            const dotX = fsx + Math.cos(angle) * (radius + 8);
            const dotY = fsy + Math.sin(angle) * (radius + 8);
            ctx.fillStyle = troopColor;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
          ctx.font = "bold 8px sans-serif";
          ctx.fillStyle = troopColor;
          ctx.textAlign = "center";
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 2;
          ctx.strokeText(`🪖${ot.count}`, fsx, fsy - radius - 28);
          ctx.fillText(`🪖${ot.count}`, fsx, fsy - radius - 28);
        }

        // ── Attack mode indicator
        if (stateRef.current.attackMode) {
          ctx.strokeStyle = "rgba(255,80,80,0.85)";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.arc(fsx, fsy, radius + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // ── NPC bases (The Unspeaken Ones)
      if (npcList) {
        for (const base of npcList) {
          if (base.hp <= 0) continue;
          const bsx = (base.posX - cx) * zoom;
          const bsy = (base.posY - cy) * zoom;
          if (bsx < -60 || bsx > W + 60 || bsy < -60 || bsy > H + 60) continue;

          const half = 22;
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.0025 + base.posX * 0.0001);

          // Deep red shadow for menace
          ctx.shadowColor = "#cc0000";
          ctx.shadowBlur = 16 * pulse;

          // Very dark stone background
          ctx.fillStyle = "#0f0808";
          ctx.beginPath();
          ctx.roundRect(bsx - half, bsy - half, half * 2, half * 2, 3);
          ctx.fill();

          // Stone brick texture on walls
          ctx.fillStyle = "#1a1212";
          for (let br = 0; br < 4; br++) {
            const brickOff = br % 2 === 0 ? 0 : 8;
            for (let bc = 0; bc < 4; bc++) {
              ctx.fillRect(
                bsx - half + bc * 11 - brickOff + 1,
                bsy - half + br * 11 + 1,
                9,
                9,
              );
            }
          }

          // Ominous red/dark walls
          ctx.strokeStyle = `rgba(180,0,0,${0.7 + 0.3 * pulse})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(bsx - half, bsy - half, half * 2, half * 2, 3);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Red glow overlay
          const npcGlow = ctx.createRadialGradient(
            bsx,
            bsy,
            0,
            bsx,
            bsy,
            half * 1.2,
          );
          npcGlow.addColorStop(0, `rgba(180,0,0,${0.15 * pulse})`);
          npcGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = npcGlow;
          ctx.beginPath();
          ctx.roundRect(bsx - half, bsy - half, half * 2, half * 2, 3);
          ctx.fill();

          // Corner skulls
          ctx.font = "10px sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText("💀", bsx - half + 1, bsy - half + 1);
          ctx.textAlign = "right";
          ctx.fillText("💀", bsx + half - 1, bsy - half + 1);

          // Center skull — larger and with red tint aura
          ctx.shadowColor = "rgba(200,0,0,0.8)";
          ctx.shadowBlur = 8 * pulse;
          ctx.font = "18px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("💀", bsx, bsy);
          ctx.shadowBlur = 0;

          // Clan name label
          ctx.font = "bold 8px sans-serif";
          ctx.fillStyle = "#cc88ff";
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.strokeStyle = "rgba(0,0,0,0.9)";
          ctx.lineWidth = 2;
          ctx.strokeText("The Unspeaken Ones", bsx, bsy - half - 18);
          ctx.fillText("The Unspeaken Ones", bsx, bsy - half - 18);

          // Member name
          ctx.font = "9px sans-serif";
          ctx.fillStyle = "#e8d5b7";
          ctx.strokeText(base.memberName, bsx, bsy + half + 14);
          ctx.fillText(base.memberName, bsx, bsy + half + 14);

          // Wall HP bar
          const wallPct = Math.max(0, base.wallHp / base.maxWallHp);
          ctx.fillStyle = "#111";
          ctx.fillRect(bsx - half, bsy - half - 12, half * 2, 5);
          ctx.fillStyle =
            wallPct > 0.5 ? "#4466bb" : wallPct > 0.2 ? "#7777cc" : "#4444aa";
          ctx.fillRect(bsx - half, bsy - half - 12, half * 2 * wallPct, 5);
          ctx.font = "6px sans-serif";
          ctx.fillStyle = "#88aaff";
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.fillText("W", bsx - half - 6, bsy - half - 8);

          // Base HP bar
          const hpPct = Math.max(0, base.hp / base.maxHp);
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(bsx - half, bsy - half - 5, half * 2, 4);
          ctx.fillStyle =
            hpPct > 0.6 ? "#aa2244" : hpPct > 0.3 ? "#cc4422" : "#ff2200";
          ctx.fillRect(bsx - half, bsy - half - 5, half * 2 * hpPct, 4);
          ctx.font = "6px sans-serif";
          ctx.fillStyle = "#ff8888";
          ctx.textAlign = "left";
          ctx.fillText("B", bsx - half - 6, bsy - half - 2);

          // Troop count
          ctx.font = "bold 8px sans-serif";
          ctx.fillStyle = "#cc88ff";
          ctx.textAlign = "center";
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 2;
          ctx.strokeText(
            `⚔ ${base.troops.toLocaleString()}`,
            bsx,
            bsy + half + 25,
          );
          ctx.fillText(
            `⚔ ${base.troops.toLocaleString()}`,
            bsx,
            bsy + half + 25,
          );

          // Attack mode red pulsing border
          if (stateRef.current.attackMode) {
            const atkPulse = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.01));
            ctx.strokeStyle = `rgba(255,0,0,${atkPulse})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.roundRect(
              bsx - half - 4,
              bsy - half - 4,
              (half + 4) * 2,
              (half + 4) * 2,
              6,
            );
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // ── Dragon NPCs
      const dragonList = stateRef.current.dragons;
      if (dragonList) {
        for (const dragon of dragonList) {
          if (!dragon.isAlive) continue;
          const dsx = (dragon.posX - cx) * zoom;
          const dsy = (dragon.posY - cy) * zoom;
          if (dsx < -80 || dsx > W + 80 || dsy < -80 || dsy > H + 80) continue;

          const pulse =
            0.5 + 0.5 * Math.sin(now * 0.003 + dragon.posX * 0.00007);

          // Glow shadow
          ctx.shadowColor = "#ff4400";
          ctx.shadowBlur = 20 * pulse;

          // Background circle
          ctx.beginPath();
          ctx.arc(dsx, dsy, 28, 0, Math.PI * 2);
          ctx.fillStyle = "#2a0000";
          ctx.fill();
          ctx.strokeStyle = `rgba(200,50,0,${0.7 + 0.3 * pulse})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Dragon body (ellipse)
          ctx.save();
          ctx.translate(dsx, dsy);
          ctx.beginPath();
          ctx.ellipse(0, 4, 10, 14, 0, 0, Math.PI * 2);
          ctx.fillStyle = "#8b0000";
          ctx.fill();

          // Wings (left and right triangles)
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.lineTo(-26, -12);
          ctx.lineTo(-22, 8);
          ctx.closePath();
          ctx.fillStyle = "#cc3300";
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(26, -12);
          ctx.lineTo(22, 8);
          ctx.closePath();
          ctx.fill();

          // Head
          ctx.beginPath();
          ctx.arc(0, -12, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#b22222";
          ctx.fill();

          // Eyes
          ctx.fillStyle = "#ffdd00";
          ctx.beginPath();
          ctx.arc(-3, -13, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(3, -13, 2, 0, Math.PI * 2);
          ctx.fill();

          // Tail (bezier)
          ctx.beginPath();
          ctx.moveTo(0, 18);
          ctx.bezierCurveTo(12, 24, 18, 18, 14, 28);
          ctx.strokeStyle = "#8b0000";
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.restore();

          // Armor bar (silver/blue, above HP bar)
          if (dragon.armorHp > 0) {
            // Armor shield arc
            const armorPct = dragon.armorHp / dragon.maxArmorHp;
            ctx.save();
            ctx.strokeStyle = "rgba(150,200,255,0.35)";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(dsx, dsy, 32, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = "rgba(100,180,255,0.85)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(
              dsx,
              dsy,
              32,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * armorPct,
            );
            ctx.stroke();
            ctx.restore();
          }

          // HP bar
          const hpPct = Math.max(0, dragon.hp / dragon.maxHp);
          ctx.fillStyle = "#111";
          ctx.fillRect(dsx - 28, dsy + 32, 56, 5);
          ctx.fillStyle =
            hpPct > 0.5 ? "#cc2200" : hpPct > 0.25 ? "#ee5500" : "#ff8800";
          ctx.fillRect(dsx - 28, dsy + 32, 56 * hpPct, 5);

          // Armor bar
          const armorPct2 = Math.max(0, dragon.armorHp / dragon.maxArmorHp);
          ctx.fillStyle = "#222";
          ctx.fillRect(dsx - 28, dsy + 26, 56, 4);
          ctx.fillStyle = "#88aaff";
          ctx.fillRect(dsx - 28, dsy + 26, 56 * armorPct2, 4);

          // Dragon emoji center
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🐉", dsx, dsy);

          // Dragon name label
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.strokeStyle = "rgba(0,0,0,0.9)";
          ctx.lineWidth = 2.5;
          ctx.strokeText(dragon.name, dsx, dsy - 34);
          ctx.fillStyle = "#ff8844";
          ctx.fillText(dragon.name, dsx, dsy - 34);

          // HP text
          ctx.font = "7px sans-serif";
          ctx.fillStyle = "#ff9966";
          ctx.strokeText(`HP: ${dragon.hp.toLocaleString()}`, dsx, dsy + 48);
          ctx.fillText(`HP: ${dragon.hp.toLocaleString()}`, dsx, dsy + 48);

          // Attack mode pulsing ring
          if (stateRef.current.attackMode) {
            const atkPulse = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.01));
            ctx.strokeStyle = `rgba(255,0,0,${atkPulse})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.arc(dsx, dsy, 36, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // ── Boss NPC at world center
      if (boss) {
        const bsx = (BOSS_X - cx) * zoom;
        const bsy = (BOSS_Y - cy) * zoom;
        if (bsx > -100 && bsx < W + 100 && bsy > -100 && bsy < H + 100) {
          ctx.shadowColor = "rgba(150,0,255,0.6)";
          ctx.shadowBlur = 20;

          ctx.fillStyle = boss.defeated ? "#1a0a2a" : "#0a0010";
          ctx.fillRect(bsx - 30, bsy - 30, 60, 60);
          ctx.strokeStyle = boss.defeated ? "#440088" : "#8800cc";
          ctx.lineWidth = 3;
          ctx.strokeRect(bsx - 30, bsy - 30, 60, 60);
          ctx.shadowBlur = 0;

          ctx.fillStyle = boss.defeated ? "#2a1040" : "#1a0030";
          for (const [ttx, tty] of [
            [-30, -30] as [number, number],
            [22, -30] as [number, number],
            [-30, 22] as [number, number],
            [22, 22] as [number, number],
          ]) {
            ctx.fillRect(bsx + ttx, bsy + tty, 8, 8);
          }

          ctx.font = "18px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("\uD83D\uDC51", bsx, bsy - 42);

          ctx.fillStyle = boss.defeated ? "#888" : "#dd00ff";
          ctx.font = "bold 9px sans-serif";
          ctx.textBaseline = "alphabetic";
          ctx.fillText("BOSS", bsx, bsy + 44);

          const bossShieldUp =
            !boss.defeated && boss.shieldCooldownUntil <= now;
          const bossShieldDown =
            !boss.defeated && boss.shieldCooldownUntil > now;

          if (bossShieldUp) {
            const sp = 0.5 + 0.5 * Math.sin(now * 0.002);
            ctx.shadowColor = "rgba(200,0,255,0.9)";
            ctx.shadowBlur = 30;
            ctx.strokeStyle = `rgba(180,0,255,${0.6 + 0.4 * sp})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(bsx, bsy, 52, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = `rgba(255,100,255,${0.3 + 0.3 * sp})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bsx, bsy, 44, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = `rgba(255,200,255,${0.2 + 0.2 * sp})`;
            ctx.lineWidth = 1;
            for (let seg = 0; seg < 6; seg++) {
              const a1 = (seg / 6) * Math.PI * 2 + now * 0.0005;
              const a2 = ((seg + 0.8) / 6) * Math.PI * 2 + now * 0.0005;
              ctx.beginPath();
              ctx.arc(bsx, bsy, 48, a1, a2);
              ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#dd88ff";
            ctx.font = "bold 7px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("\uD83D\uDEE1 SHIELDED", bsx, bsy + 58);
          }

          if (bossShieldDown) {
            const flash = 0.5 + 0.5 * Math.sin(now * 0.008);
            ctx.strokeStyle = `rgba(255,50,50,${0.6 + 0.4 * flash})`;
            ctx.shadowColor = "rgba(255,0,0,0.8)";
            ctx.shadowBlur = 20;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.arc(bsx, bsy, 50, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(255,80,80,${0.7 + 0.3 * flash})`;
            ctx.font = "bold 8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("\u2694 OPEN TO ATTACK", bsx, bsy + 58);
            const remaining = Math.max(
              0,
              Math.ceil((boss.shieldCooldownUntil - now) / 1000),
            );
            if (remaining > 0) {
              const mins = Math.floor(remaining / 60);
              const secs = remaining % 60;
              ctx.fillStyle = "#ffaa44";
              ctx.font = "7px sans-serif";
              ctx.fillText(
                `\uD83D\uDEE1 recharge: ${mins}m ${secs}s`,
                bsx,
                bsy + 67,
              );
            }
          }

          const wallPct = Math.max(
            0,
            boss.wallHp / Math.max(1, boss.maxWallHp),
          );
          ctx.fillStyle = "#111";
          ctx.fillRect(bsx - 32, bsy - 56, 64, 5);
          ctx.fillStyle = wallPct > 0.5 ? "#4488ff" : "#2255cc";
          ctx.fillRect(bsx - 32, bsy - 56, 64 * wallPct, 5);

          const basePct = Math.max(
            0,
            boss.baseHp / Math.max(1, boss.maxBaseHp),
          );
          ctx.fillStyle = "#111";
          ctx.fillRect(bsx - 32, bsy - 49, 64, 5);
          ctx.fillStyle =
            basePct > 0.6 ? "#bb00ee" : basePct > 0.3 ? "#ff6600" : "#ff2200";
          ctx.fillRect(bsx - 32, bsy - 49, 64 * basePct, 5);

          ctx.font = "6px sans-serif";
          ctx.textAlign = "left";
          ctx.fillStyle = "#88aaff";
          ctx.fillText("W", bsx - 42, bsy - 52);
          ctx.fillStyle = "#dd88ff";
          ctx.fillText("B", bsx - 42, bsy - 45);

          if (boss.defeated) {
            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(bsx - 30, bsy - 30, 60, 60);
            ctx.fillStyle = "#ff4444";
            ctx.font = "bold 8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("DEFEATED", bsx, bsy + 4);
          } else if (stateRef.current.attackMode) {
            ctx.strokeStyle = "#ff00ff";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(bsx - 34, bsy - 34, 68, 68);
            ctx.setLineDash([]);
          }
        }
      }

      // ── Players
      const allPlayers = [...ps];
      if (mp && !allPlayers.find((p) => p.username === mp.username)) {
        allPlayers.push(mp);
      }

      for (const player of allPlayers) {
        const psx = (player.posX - cx) * zoom;
        const psy = (player.posY - cy) * zoom;
        if (psx < -80 || psx > W + 80 || psy < -80 || psy > H + 80) continue;

        const playerClan = cl.find((c) =>
          c.memberUsernames.includes(player.username),
        );
        const color = playerClan?.color || "#888888";
        const isMe = player.username === mp?.username;

        // Shield ring (suppressed when shield is hacked)
        const myHackedUntil = stateRef.current.myShieldHackedUntil;
        const isShieldHacked =
          (player.shieldHackedUntil != null &&
            Date.now() < player.shieldHackedUntil) ||
          (isMe && myHackedUntil != null && Date.now() < myHackedUntil);
        const hasShield =
          !isShieldHacked && (player.shieldActive || (isMe && shieldOn));
        if (hasShield) {
          const sp = 0.5 + 0.5 * Math.sin(now * 0.003);
          // Outer glow ring
          ctx.shadowColor = "rgba(0,200,255,0.9)";
          ctx.shadowBlur = 18;
          ctx.strokeStyle = `rgba(0,200,255,${0.6 + 0.4 * sp})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(psx, psy, 34 * zoom, 0, Math.PI * 2);
          ctx.stroke();
          // Inner glow ring
          ctx.strokeStyle = `rgba(100,230,255,${0.3 + 0.2 * sp})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(psx, psy, 28 * zoom, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Pulse ring for own base
        if (isMe) {
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
          ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(psx, psy, (28 + pulse * 4) * zoom, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 8;
        // ── Check if base has a custom photo to use as base theme
        const _bpCache = stateRef.current._photoCache;
        const _bpImg = _bpCache ? _bpCache.get(player.username) : undefined;
        const _hasBasePhoto = !!(player.basePhotoUrl && _bpImg?.complete);
        if (!_hasBasePhoto) {
          drawDetailedBase(
            ctx,
            psx,
            psy,
            40 * zoom,
            color,
            player.upgradeLevel || 1,
            hasShield,
          );
        } else {
          // Draw photo as full base theme replacing the stone fortress
          const _bpSize = 44 * zoom;
          const _bpHalf = _bpSize / 2;
          // Drop shadow
          ctx.shadowColor = "rgba(0,0,0,0.7)";
          ctx.shadowBlur = 10;
          ctx.save();
          // Rounded square clip
          const _bpR = _bpSize * 0.15;
          ctx.beginPath();
          ctx.moveTo(psx - _bpHalf + _bpR, psy - _bpHalf);
          ctx.lineTo(psx + _bpHalf - _bpR, psy - _bpHalf);
          ctx.quadraticCurveTo(
            psx + _bpHalf,
            psy - _bpHalf,
            psx + _bpHalf,
            psy - _bpHalf + _bpR,
          );
          ctx.lineTo(psx + _bpHalf, psy + _bpHalf - _bpR);
          ctx.quadraticCurveTo(
            psx + _bpHalf,
            psy + _bpHalf,
            psx + _bpHalf - _bpR,
            psy + _bpHalf,
          );
          ctx.lineTo(psx - _bpHalf + _bpR, psy + _bpHalf);
          ctx.quadraticCurveTo(
            psx - _bpHalf,
            psy + _bpHalf,
            psx - _bpHalf,
            psy + _bpHalf - _bpR,
          );
          ctx.lineTo(psx - _bpHalf, psy - _bpHalf + _bpR);
          ctx.quadraticCurveTo(
            psx - _bpHalf,
            psy - _bpHalf,
            psx - _bpHalf + _bpR,
            psy - _bpHalf,
          );
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(
            _bpImg!,
            psx - _bpHalf,
            psy - _bpHalf,
            _bpSize,
            _bpSize,
          );
          ctx.restore();
          ctx.shadowBlur = 0;
          // Colored border ring
          ctx.strokeStyle = color;
          ctx.lineWidth = 3 * zoom;
          ctx.beginPath();
          const _bpR2 = _bpSize * 0.15;
          ctx.moveTo(psx - _bpHalf + _bpR2, psy - _bpHalf);
          ctx.lineTo(psx + _bpHalf - _bpR2, psy - _bpHalf);
          ctx.quadraticCurveTo(
            psx + _bpHalf,
            psy - _bpHalf,
            psx + _bpHalf,
            psy - _bpHalf + _bpR2,
          );
          ctx.lineTo(psx + _bpHalf, psy + _bpHalf - _bpR2);
          ctx.quadraticCurveTo(
            psx + _bpHalf,
            psy + _bpHalf,
            psx + _bpHalf - _bpR2,
            psy + _bpHalf,
          );
          ctx.lineTo(psx - _bpHalf + _bpR2, psy + _bpHalf);
          ctx.quadraticCurveTo(
            psx - _bpHalf,
            psy + _bpHalf,
            psx - _bpHalf,
            psy + _bpHalf - _bpR2,
          );
          ctx.lineTo(psx - _bpHalf, psy - _bpHalf + _bpR2);
          ctx.quadraticCurveTo(
            psx - _bpHalf,
            psy - _bpHalf,
            psx - _bpHalf + _bpR2,
            psy - _bpHalf,
          );
          ctx.closePath();
          ctx.stroke();
          // Clan color glow corner accent
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = color;
          ctx.fillRect(
            psx - _bpHalf,
            psy + _bpHalf - 6 * zoom,
            _bpSize,
            6 * zoom,
          );
          ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;

        // Wall HP bar
        const wallHp = player.wallHp ?? 0;
        const maxWallHp = player.maxWallHp ?? 60000;
        if (maxWallHp > 0) {
          const wPct = Math.max(0, Math.min(1, wallHp / maxWallHp));
          ctx.fillStyle = "#111";
          ctx.fillRect(psx - 22 * zoom, psy - 38 * zoom, 44 * zoom, 5 * zoom);
          ctx.fillStyle =
            wPct > 0.5 ? "#4488ee" : wPct > 0.2 ? "#8888ff" : "#5555cc";
          ctx.fillRect(
            psx - 22 * zoom,
            psy - 38 * zoom,
            44 * zoom * wPct,
            5 * zoom,
          );
          ctx.font = "6px sans-serif";
          ctx.fillStyle = "#88aaff";
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.fillText("W", psx - 28, psy - 34);
        }

        // Base HP bar
        const hpPct = Math.max(
          0,
          player.hp / (player.maxBaseHp || player.maxHp || 100),
        );
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(psx - 22 * zoom, psy - 30 * zoom, 44 * zoom, 5 * zoom);
        ctx.fillStyle =
          hpPct > 0.6 ? "#4CAF50" : hpPct > 0.3 ? "#FF9800" : "#F44336";
        ctx.fillRect(psx - 22, psy - 30, 44 * hpPct, 5);
        ctx.font = "6px sans-serif";
        ctx.fillStyle = "#88cc88";
        ctx.textAlign = "left";
        ctx.fillText("B", psx - 28, psy - 26);

        // Username
        ctx.fillStyle = "white";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 4;
        ctx.fillText(player.username, psx, psy - 44);
        if (playerClan) {
          ctx.font = "9px sans-serif";
          ctx.fillStyle = playerClan.color;
          ctx.fillText(`[${playerClan.name}]`, psx, psy - 54);
        }
        ctx.shadowBlur = 0;

        // ── DEV Banner for SableSoulreaver
        if (player.username === "SableSoulreaver") {
          drawDevBanner(ctx, psx, psy, now);
        }

        // ── Anti-Air Gun indicator
        if ((player.antiAirCount ?? 0) > 0) {
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.font = "9px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = "#88aaff";
          ctx.shadowColor = "rgba(100,150,255,0.6)";
          ctx.shadowBlur = 3;
          ctx.fillText(`🔫 AA x${player.antiAirCount}`, psx, psy + 52);
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ── Tornado Shelter icon (shown on player's own base)
        if (isMe && stateRef.current.hasTornadoShelter) {
          const shelterX = psx + 22;
          const shelterY = psy + 22;
          const sz = 9;
          // Bunker base (dark gray rectangle)
          ctx.fillStyle = "#4A5568";
          ctx.fillRect(shelterX - sz, shelterY - sz * 0.5, sz * 2, sz);
          // Green roof triangle
          ctx.fillStyle = "#38A169";
          ctx.beginPath();
          ctx.moveTo(shelterX - sz - 2, shelterY - sz * 0.5);
          ctx.lineTo(shelterX, shelterY - sz * 1.6);
          ctx.lineTo(shelterX + sz + 2, shelterY - sz * 0.5);
          ctx.closePath();
          ctx.fill();
          // Door
          ctx.fillStyle = "#2D3748";
          ctx.fillRect(shelterX - sz * 0.2, shelterY, sz * 0.4, sz * 0.4);
        }

        // ── Alert status: under attack
        if (atkTargets?.has(player.username)) {
          const alertPulse = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.008));
          ctx.strokeStyle = `rgba(255,0,0,${alertPulse})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(psx, psy, 36 + alertPulse * 6, 0, Math.PI * 2);
          ctx.stroke();
          // Alert emoji above the base
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillText("\uD83D\uDEA8", psx, psy - 62);
        }

        // Attack indicator
        if (stateRef.current.attackMode && !isMe) {
          if (hasShield) {
            // Shield lock — gray indicator
            ctx.strokeStyle = "rgba(100,160,255,0.7)";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(psx - 24, psy - 24, 48, 48);
            ctx.setLineDash([]);
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("\uD83D\uDEE1\uFE0F", psx, psy + 32);
          } else {
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(psx - 24, psy - 24, 48, 48);
            ctx.setLineDash([]);
            ctx.fillStyle = "#ff0000";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("\u2694", psx, psy + 30);
          }
        }
      }

      // Training animation near myPlayer
      if (mp) {
        const trainX = (mp.posX - cx) * zoom + 32;
        const trainY = (mp.posY - cy) * zoom - 32;
        const animT = (now / 600) % 1;
        for (let di = 0; di < 3; di++) {
          const angle = (animT + di / 3) * Math.PI * 2;
          const dotX = trainX + Math.cos(angle) * 7;
          const dotY = trainY + Math.sin(angle) * 7;
          ctx.fillStyle = `rgba(125,207,69,${0.6 + 0.4 * Math.sin(now * 0.005 + di)})`;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Healing return trail
      if (hq.length > 0 && mp) {
        const hbx = (mp.posX - cx) * zoom;
        const hby = (mp.posY - cy) * zoom;
        const angle = Math.PI * 1.3;
        const startX = hbx + Math.cos(angle) * 80;
        const startY = hby + Math.sin(angle) * 80;

        ctx.strokeStyle = "rgba(80,220,80,0.55)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(hbx, hby);
        ctx.stroke();
        ctx.setLineDash([]);

        const dotProgress = (now / 1200) % 1;
        const dotX = startX + (hbx - startX) * dotProgress;
        const dotY = startY + (hby - startY) * dotProgress;
        ctx.fillStyle = "#50ee50";
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(80,220,80,0.9)";
        ctx.font = "8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`\u2764\uFE0F ${hq[0].troops}`, startX, startY - 8);
      }

      // ── Clan HQ buildings
      for (const clan of cl) {
        if (!clan.hqPos) continue;
        const hqSx = (clan.hqPos.x - cx) * zoom;
        const hqSy = (clan.hqPos.y - cy) * zoom;
        if (hqSx < -80 || hqSx > W + 80 || hqSy < -80 || hqSy > H + 80)
          continue;
        drawClanHQ(ctx, hqSx, hqSy, clan, 1);

        // Draw clan dragon near HQ if player owns one
        if (stateRef.current.hasClanDragon) {
          const mp2 = stateRef.current.myPlayer;
          const isDragonMode = stateRef.current.dragonModeActive;
          if (
            mp2 &&
            clan.memberUsernames.includes(mp2.username) &&
            (clan.hqHp ?? 0) > 0
          ) {
            const dragonOffsetX = hqSx + 55;
            const dragonOffsetY = hqSy - 25;
            const pulse = 0.5 + 0.5 * Math.sin(now * 0.003);
            const alpha = isDragonMode ? 1 : 0.45;
            try {
              const glow = ctx.createRadialGradient(
                dragonOffsetX,
                dragonOffsetY,
                0,
                dragonOffsetX,
                dragonOffsetY,
                isDragonMode ? 42 : 28,
              );
              if (isDragonMode) {
                glow.addColorStop(0, `rgba(160,0,255,${0.5 + 0.3 * pulse})`);
                glow.addColorStop(0.5, `rgba(100,0,200,${0.25 + 0.1 * pulse})`);
              } else {
                glow.addColorStop(0, "rgba(80,0,140,0.3)");
                glow.addColorStop(0.5, "rgba(50,0,100,0.15)");
              }
              glow.addColorStop(1, "rgba(30,0,60,0)");
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(
                dragonOffsetX,
                dragonOffsetY,
                isDragonMode ? 42 : 28,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            } catch {
              /* ignore */
            }
            ctx.globalAlpha = alpha;
            ctx.font = `${isDragonMode ? 20 + 4 * pulse : 16}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🐉", dragonOffsetX, dragonOffsetY);
            ctx.font = `bold ${isDragonMode ? 9 : 8}px sans-serif`;
            ctx.fillStyle = isDragonMode ? "#dd88ff" : "#997acc";
            ctx.strokeStyle = "#110022";
            ctx.lineWidth = 2;
            ctx.strokeText(
              isDragonMode ? "DRAGON ACTIVE" : "DRAGON",
              dragonOffsetX,
              dragonOffsetY + 20,
            );
            ctx.fillText(
              isDragonMode ? "DRAGON ACTIVE" : "DRAGON",
              dragonOffsetX,
              dragonOffsetY + 20,
            );
            ctx.globalAlpha = 1;
            ctx.textBaseline = "alphabetic";
          }
        }

        // Draw Special Forces Squad near HQ if clan owns one
        if (stateRef.current.hasSpecialForces) {
          const mp3 = stateRef.current.myPlayer;
          if (
            mp3 &&
            clan.memberUsernames.includes(mp3.username) &&
            (clan.hqHp ?? 0) > 0
          ) {
            const sfX = hqSx - 55;
            const sfY = hqSy + 10;
            const pulse2 = 0.5 + 0.5 * Math.sin(now * 0.002 + 1);
            // Green glow
            try {
              const sfGlow = ctx.createRadialGradient(
                sfX,
                sfY,
                0,
                sfX,
                sfY,
                36,
              );
              sfGlow.addColorStop(0, `rgba(0,200,100,${0.35 + 0.2 * pulse2})`);
              sfGlow.addColorStop(0.5, "rgba(0,150,80,0.18)");
              sfGlow.addColorStop(1, "rgba(0,80,40,0)");
              ctx.fillStyle = sfGlow;
              ctx.beginPath();
              ctx.arc(sfX, sfY, 36, 0, Math.PI * 2);
              ctx.fill();
            } catch {
              /* ignore */
            }
            // Draw 5 soldier icons in formation
            const formation = [
              [sfX - 10, sfY - 10],
              [sfX + 10, sfY - 10],
              [sfX, sfY - 20],
              [sfX - 10, sfY + 5],
              [sfX + 10, sfY + 5],
            ];
            ctx.font = "10px serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.globalAlpha = 0.95;
            for (const [fx, fy] of formation) {
              ctx.fillText("🪖", fx, fy);
            }
            // Label
            ctx.font = "bold 7px sans-serif";
            ctx.fillStyle = "#44ffaa";
            ctx.strokeStyle = "#001a0a";
            ctx.lineWidth = 2;
            ctx.strokeText("⚔ SPECIAL FORCES", sfX, sfY - 30);
            ctx.fillText("⚔ SPECIAL FORCES", sfX, sfY - 30);
            // HP bar
            const barW = 56;
            const barX = sfX - barW / 2;
            const barY = sfY + 20;
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(barX, barY, barW, 5);
            ctx.fillStyle = "#00cc66";
            ctx.fillRect(barX, barY, barW, 5);
            ctx.font = "5px sans-serif";
            ctx.fillStyle = "#ccffee";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.strokeText("SF: 250K HP | 200K Armor", sfX, barY + 10);
            ctx.fillText("SF: 250K HP | 200K Armor", sfX, barY + 10);
            ctx.globalAlpha = 1;
            ctx.textBaseline = "alphabetic";
          }
        }

        // Draw Hacker icon near HQ if player owns one
        if (stateRef.current.hasHacker) {
          const mp4 = stateRef.current.myPlayer;
          if (
            mp4 &&
            clan.memberUsernames.includes(mp4.username) &&
            (clan.hqHp ?? 0) > 0
          ) {
            const hkX = hqSx + 30;
            const hkY = hqSy + 30;
            const pulse3 = 0.5 + 0.5 * Math.sin(now * 0.004 + 2);
            try {
              const hkGlow = ctx.createRadialGradient(
                hkX,
                hkY,
                0,
                hkX,
                hkY,
                28,
              );
              hkGlow.addColorStop(0, `rgba(0,180,255,${0.35 + 0.2 * pulse3})`);
              hkGlow.addColorStop(0.5, "rgba(0,120,200,0.15)");
              hkGlow.addColorStop(1, "rgba(0,60,100,0)");
              ctx.fillStyle = hkGlow;
              ctx.beginPath();
              ctx.arc(hkX, hkY, 28, 0, Math.PI * 2);
              ctx.fill();
            } catch {
              /* ignore */
            }
            ctx.globalAlpha = 0.9;
            ctx.font = `${14 + 2 * pulse3}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("💻", hkX, hkY);
            ctx.font = "bold 7px sans-serif";
            ctx.fillStyle = "#00ccff";
            ctx.strokeStyle = "#001a22";
            ctx.lineWidth = 2;
            ctx.textBaseline = "alphabetic";
            ctx.strokeText("HACKER", hkX, hkY + 18);
            ctx.fillText("HACKER", hkX, hkY + 18);
            ctx.globalAlpha = 1;
          }
        }

        if (stateRef.current.attackMode && (clan.hqHp || 0) > 0) {
          const isMine = mp
            ? clan.memberUsernames.includes(mp.username)
            : false;
          if (!isMine) {
            ctx.strokeStyle = "#ff00aa";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(hqSx - 28, hqSy - 28, 56, 56);
            ctx.setLineDash([]);
          }
        }
      }

      // ── Attack flashes
      for (const flash of flashes) {
        const elapsed = now - flash.startTime;
        if (elapsed > 600) continue;
        const fsx = (flash.x - cx) * zoom;
        const fsy = (flash.y - cy) * zoom;
        if (fsx < -80 || fsx > W + 80 || fsy < -80 || fsy > H + 80) continue;
        const progress = elapsed / 600;
        const radius = 5 + 40 * progress;
        const alpha = 1 - progress;
        try {
          const grad = ctx.createRadialGradient(fsx, fsy, 0, fsx, fsy, radius);
          grad.addColorStop(0, `rgba(255,120,0,${alpha})`);
          grad.addColorStop(0.5, `rgba(255,50,0,${alpha * 0.6})`);
          grad.addColorStop(1, "rgba(255,0,0,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(fsx, fsy, radius, 0, Math.PI * 2);
          ctx.fill();
        } catch {
          // ignore
        }
      }

      // ── Nuclear blasts
      for (const nuke of nukes) {
        const elapsed = now - nuke.startTime;
        if (elapsed > 3000) continue;
        const nsx = (nuke.x - cx) * zoom;
        const nsy = (nuke.y - cy) * zoom;
        if (nsx < -300 || nsx > W + 300 || nsy < -300 || nsy > H + 300)
          continue;
        drawNuclearBlast(ctx, nsx, nsy, elapsed);
      }

      // ── Marching armies
      for (const march of marches) {
        const elapsed = now - march.startTime;
        const progress = Math.min(1, elapsed / march.duration);
        const sx =
          (march.fromX + (march.toX - march.fromX) * progress - cx) * zoom;
        const sy2 =
          (march.fromY + (march.toY - march.fromY) * progress - cy) * zoom;

        if (sx < -60 || sx > W + 60 || sy2 < -60 || sy2 > H + 60) continue;

        // March path
        const pathFromX = (march.fromX - cx) * zoom;
        const pathFromY = (march.fromY - cy) * zoom;
        const pathToX = (march.toX - cx) * zoom;
        const pathToY = (march.toY - cy) * zoom;

        const angle2 = Math.atan2(
          march.toY - march.fromY,
          march.toX - march.fromX,
        );

        // ── Glow pass (wide, semi-transparent) ────────────────────────────────────
        ctx.save();
        const marchGlowColor =
          march.marchType === "reinforce"
            ? "#44cc8844"
            : `${march.attackerColor}44`;
        ctx.strokeStyle = marchGlowColor;
        ctx.lineWidth = 8 * zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pathFromX, pathFromY);
        ctx.lineTo(pathToX, pathToY);
        ctx.stroke();

        // ── Solid dashed march line ──────────────────────────────────────────────
        ctx.strokeStyle =
          march.marchType === "reinforce" ? "#44cc88" : march.attackerColor;
        ctx.lineWidth = 2.5 * zoom;
        ctx.setLineDash([8 * zoom, 5 * zoom]);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(pathFromX, pathFromY);
        ctx.lineTo(pathToX, pathToY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // ── Arrowhead at target end ────────────────────────────────────────────
        const arrowSize = 10 * zoom;
        ctx.fillStyle =
          march.marchType === "reinforce" ? "#44cc88" : march.attackerColor;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(
          pathToX + Math.cos(angle2) * arrowSize,
          pathToY + Math.sin(angle2) * arrowSize,
        );
        ctx.lineTo(
          pathToX + Math.cos(angle2 + 2.4) * arrowSize * 0.8,
          pathToY + Math.sin(angle2 + 2.4) * arrowSize * 0.8,
        );
        ctx.lineTo(
          pathToX + Math.cos(angle2 - 2.4) * arrowSize * 0.8,
          pathToY + Math.sin(angle2 - 2.4) * arrowSize * 0.8,
        );
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();

        const perpX = -Math.sin(angle2);
        const perpY = Math.cos(angle2);
        const troopColor = march.attackerColor;
        const pulse =
          0.7 + 0.3 * Math.sin(now * 0.006 + march.startTime * 0.001);

        const positions = [
          [sx, sy2],
          [sx + perpX * 7, sy2 + perpY * 7],
          [sx - perpX * 7, sy2 - perpY * 7],
          [
            sx - Math.cos(angle2) * 10 + perpX * 5,
            sy2 - Math.sin(angle2) * 10 + perpY * 5,
          ],
          [
            sx - Math.cos(angle2) * 10 - perpX * 5,
            sy2 - Math.sin(angle2) * 10 - perpY * 5,
          ],
        ];

        // ── Unit-type emoji above lead troop (Feature 7) ─────────────────────────
        const unitEmoji =
          march.marchType === "reinforce"
            ? "🛡"
            : march.unitType === "tanks"
              ? "🛡"
              : march.unitType === "jets"
                ? "✈️"
                : march.unitType === "soldiers"
                  ? "🪖"
                  : "🪖";
        const isReturnMarch =
          march.isReturn === true || march.targetType === "return";
        // Use a green line color for reinforce marches
        const displayColor =
          march.marchType === "reinforce" ? "#44cc88" : troopColor;
        ctx.font = `${Math.max(10, 14 * zoom)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(unitEmoji, sx, sy2 - 12 * zoom);

        for (const [px, py] of positions) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.ellipse(px, py + 5 * zoom, 5 * zoom, 2 * zoom, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = displayColor;
          ctx.globalAlpha = pulse;
          ctx.beginPath();
          ctx.arc(px, py, 5 * zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 5 * zoom, 0, Math.PI * 2);
          ctx.stroke();
        }

        const remaining = Math.max(0, (march.duration - elapsed) / 1000);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        const isReturn = isReturnMarch;
        const marchTypeLabel =
          march.marchType === "reinforce" ? "🛡" : isReturn ? "↩" : "⚔";
        const label =
          remaining > 0
            ? `${march.attackerUsername} ${marchTypeLabel} ${mins}:${secs.toString().padStart(2, "0")}`
            : `${march.attackerUsername} ${marchTypeLabel} ${isReturn ? "ARRIVED" : march.marchType === "reinforce" ? "REINFORCED!" : "ATTACK!"}`;
        ctx.font = "bold 9px sans-serif";
        ctx.fillStyle =
          march.marchType === "reinforce"
            ? "#44cc88"
            : isReturn
              ? "#88ff88"
              : troopColor;
        ctx.strokeStyle = "rgba(0,0,0,0.8)";
        ctx.lineWidth = 2;
        ctx.textAlign = "center";
        ctx.shadowBlur = 0;
        ctx.strokeText(label, sx, sy2 - 14);
        ctx.fillText(label, sx, sy2 - 14);
      }

      // ── Night Thugs ──────────────────────────────────────────────────────────
      {
        const thugs = stateRef.current.nightThugs;
        if (thugs?.active && !thugs.despawning) {
          const tx = (thugs.posX - cx) * zoom;
          const ty = (thugs.posY - cy) * zoom;

          // Find target position
          const allPs = [...stateRef.current.players];
          if (stateRef.current.myPlayer) allPs.push(stateRef.current.myPlayer);
          const tgt = allPs.find((p) => p.id === thugs.targetPlayerId);

          if (tgt) {
            const ttx = (tgt.posX - cx) * zoom;
            const tty = (tgt.posY - cy) * zoom;

            // Draw red glow path line from thugs to target
            ctx.save();
            ctx.strokeStyle = "rgba(255,60,0,0.25)";
            ctx.lineWidth = 10 * zoom;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(ttx, tty);
            ctx.stroke();

            ctx.strokeStyle = "#ff3300";
            ctx.lineWidth = 2.5 * zoom;
            ctx.setLineDash([8 * zoom, 5 * zoom]);
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(ttx, tty);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            // Arrowhead at target
            const ang = Math.atan2(
              tgt.posY - thugs.posY,
              tgt.posX - thugs.posX,
            );
            const aSize = 10 * zoom;
            ctx.fillStyle = "#ff3300";
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.moveTo(
              ttx + Math.cos(ang) * aSize,
              tty + Math.sin(ang) * aSize,
            );
            ctx.lineTo(
              ttx + Math.cos(ang + 2.4) * aSize * 0.8,
              tty + Math.sin(ang + 2.4) * aSize * 0.8,
            );
            ctx.lineTo(
              ttx + Math.cos(ang - 2.4) * aSize * 0.8,
              tty + Math.sin(ang - 2.4) * aSize * 0.8,
            );
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
          }

          // Draw thug icon with red pulsing glow
          if (tx > -60 && tx < W + 60 && ty > -60 && ty < H + 60) {
            const pulse = 0.6 + 0.4 * Math.sin(now * 0.008);
            ctx.save();
            ctx.shadowBlur = 20 * pulse;
            ctx.shadowColor = "#ff2200";
            ctx.font = `${Math.max(12, 18 * zoom)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText("🔪", tx, ty - 4 * zoom);
            ctx.shadowBlur = 0;

            // Pulsing red circle behind icon
            ctx.globalAlpha = 0.3 * pulse;
            ctx.fillStyle = "#ff2200";
            ctx.beginPath();
            ctx.arc(tx, ty, 14 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // THUGS label
            ctx.font = `bold ${Math.max(8, 10 * zoom)}px sans-serif`;
            ctx.fillStyle = "#ff4422";
            ctx.shadowBlur = 6;
            ctx.shadowColor = "#000";
            ctx.strokeStyle = "rgba(0,0,0,0.9)";
            ctx.lineWidth = 3;
            ctx.strokeText("THUGS", tx, ty + 16 * zoom);
            ctx.fillText("THUGS", tx, ty + 16 * zoom);
            ctx.shadowBlur = 0;

            // Raid progress bar if raiding
            if (thugs.reachedAt) {
              const barW = 40 * zoom;
              const barH = 5 * zoom;
              const bx = tx - barW / 2;
              const by = ty + 22 * zoom;
              ctx.fillStyle = "rgba(0,0,0,0.6)";
              ctx.fillRect(bx, by, barW, barH);
              ctx.fillStyle = "#ff2200";
              ctx.fillRect(bx, by, barW * thugs.raidProgress, barH);
            }

            ctx.restore();
          }
        }
      }

      // ── Pond Trolls
      {
        const trolls = stateRef.current.pondTrolls;
        if (trolls) {
          for (const troll of trolls) {
            if (!troll.alive) continue;
            const tsx = (troll.x - cx) * zoom;
            const tsy = (troll.y - cy) * zoom;
            if (tsx < -60 || tsx > W + 60 || tsy < -60 || tsy > H + 60)
              continue;
            const pulse = 0.6 + 0.4 * Math.sin(now * 0.003 + troll.x * 0.001);
            // Glow aura
            ctx.save();
            const glowR = 30 * zoom;
            try {
              const trollGlow = ctx.createRadialGradient(
                tsx,
                tsy,
                0,
                tsx,
                tsy,
                glowR,
              );
              trollGlow.addColorStop(0, `rgba(0,180,60,${0.35 * pulse})`);
              trollGlow.addColorStop(1, "rgba(0,100,20,0)");
              ctx.fillStyle = trollGlow;
              ctx.beginPath();
              ctx.arc(tsx, tsy, glowR, 0, Math.PI * 2);
              ctx.fill();
            } catch {
              /* */
            }
            ctx.restore();
            // Troll emoji
            ctx.font = `${Math.max(14, 20 * zoom)}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.globalAlpha = 0.9;
            ctx.fillText("\u{1F9CC}", tsx, tsy);
            ctx.globalAlpha = 1;
            // HP bar
            const hpBarW = 36 * zoom;
            const hpBarH = 4 * zoom;
            const hpPct = troll.hp / troll.maxHp;
            const barX = tsx - hpBarW / 2;
            const barY = tsy + 14 * zoom;
            ctx.fillStyle = "#220a00";
            ctx.fillRect(barX, barY, hpBarW, hpBarH);
            ctx.fillStyle =
              hpPct > 0.5 ? "#33cc44" : hpPct > 0.25 ? "#ffaa00" : "#ff3300";
            ctx.fillRect(barX, barY, hpBarW * hpPct, hpBarH);
            // Label
            ctx.font = `bold ${Math.max(7, 9 * zoom)}px sans-serif`;
            ctx.fillStyle = "#88ffaa";
            ctx.strokeStyle = "#001a00";
            ctx.lineWidth = 2;
            ctx.strokeText("TROLL", tsx, barY + hpBarH + 8 * zoom);
            ctx.fillText("TROLL", tsx, barY + hpBarH + 8 * zoom);
          }
        }
      }

      // ── Sky Jets (visual prop only — no damage)
      {
        const jets = stateRef.current.skyJets;
        if (jets) {
          for (const jet of jets) {
            // Map-space: compute screen coords using jet.x/y as world coords
            const jx = (jet.x - cx) * zoom;
            const jy = (jet.y - cy) * zoom;
            ctx.save();
            ctx.globalAlpha = 0.82;
            ctx.translate(jx, jy);
            ctx.rotate(jet.angle);
            // Draw jet as a simple plane shape
            ctx.fillStyle = "#ccccee";
            ctx.strokeStyle = "#8888aa";
            ctx.lineWidth = 1;
            ctx.beginPath();
            const jSize = Math.max(10, 14 * zoom);
            // Fuselage
            ctx.moveTo(jSize, 0);
            ctx.lineTo(-jSize, -jSize * 0.18);
            ctx.lineTo(-jSize * 0.6, 0);
            ctx.lineTo(-jSize, jSize * 0.18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Wings
            ctx.fillStyle = "#aaaacc";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-jSize * 0.3, -jSize * 0.65);
            ctx.lineTo(-jSize * 0.65, -jSize * 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-jSize * 0.3, jSize * 0.65);
            ctx.lineTo(-jSize * 0.65, jSize * 0.15);
            ctx.closePath();
            ctx.fill();
            // Engine trail
            ctx.strokeStyle = "rgba(200,220,255,0.5)";
            ctx.lineWidth = 2 * zoom;
            ctx.setLineDash([4 * zoom, 4 * zoom]);
            ctx.beginPath();
            ctx.moveTo(-jSize, 0);
            ctx.lineTo(-jSize * 2.5, 0);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Bomb explosion flash if this jet has a bomb that's exploding
            if (
              jet.hasBomb &&
              jet.bombX !== undefined &&
              jet.bombY !== undefined &&
              jet.bombProgress !== undefined
            ) {
              const bx = (jet.bombX - cx) * zoom;
              const by = (jet.bombY - cy) * zoom;
              if (bx >= -80 && bx <= W + 80 && by >= -80 && by <= H + 80) {
                const bp = jet.bombProgress; // 0..1
                const br = bp * 40 * zoom;
                ctx.save();
                ctx.globalAlpha = (1 - bp) * 0.75;
                try {
                  const bombGrad = ctx.createRadialGradient(
                    bx,
                    by,
                    0,
                    bx,
                    by,
                    br,
                  );
                  bombGrad.addColorStop(0, "#ffffff");
                  bombGrad.addColorStop(0.3, "#ffee44");
                  bombGrad.addColorStop(0.6, "#ff6600");
                  bombGrad.addColorStop(1, "rgba(120,40,10,0)");
                  ctx.fillStyle = bombGrad;
                  ctx.beginPath();
                  ctx.arc(bx, by, br, 0, Math.PI * 2);
                  ctx.fill();
                } catch {
                  /* */
                }
                ctx.restore();
              }
            }
          }
        }
      }

      // ── Rain particles (weather overlay)
      {
        const raining = stateRef.current.isRaining;
        if (raining) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.strokeStyle = "rgba(140,180,255,0.8)";
          ctx.lineWidth = 1;
          const rainSeed = Math.floor(now / 40);
          for (let ri = 0; ri < 150; ri++) {
            // Pseudo-random positions that shift each frame
            const rx = ((ri * 7919 + rainSeed * 13) % (W * 1.5)) - W * 0.25;
            const ry =
              ((ri * 6271 + rainSeed * 7 + ri * 31) % (H * 1.4)) - H * 0.1;
            const rLen = 8 + (ri % 5) * 2;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - rLen * 0.3, ry + rLen);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // ── Tornado rendering
      {
        const tornado = stateRef.current.tornadoRender;
        if (tornado) {
          // Convert path endpoints to screen coords
          const psx1 = (tornado.pathStartX - cx) * zoom;
          const psy1 = (tornado.pathStartY - cy) * zoom;
          const psx2 = (tornado.pathEndX - cx) * zoom;
          const psy2 = (tornado.pathEndY - cy) * zoom;
          const halfW = (tornado.pathWidth / 2) * zoom;

          // Direction perpendicular to path
          const pathDx = psx2 - psx1;
          const pathDy = psy2 - psy1;
          const pathLen = Math.max(
            1,
            Math.sqrt(pathDx * pathDx + pathDy * pathDy),
          );
          const perpX = (-pathDy / pathLen) * halfW;
          const perpY = (pathDx / pathLen) * halfW;

          // Draw warning path strip
          if (tornado.warning || tornado.progress >= 0) {
            ctx.save();
            ctx.globalAlpha = tornado.warning ? 0.35 : 0.18;
            ctx.fillStyle = tornado.warning ? "#ffaa22" : "#886622";
            ctx.beginPath();
            ctx.moveTo(psx1 + perpX, psy1 + perpY);
            ctx.lineTo(psx2 + perpX, psy2 + perpY);
            ctx.lineTo(psx2 - perpX, psy2 - perpY);
            ctx.lineTo(psx1 - perpX, psy1 - perpY);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Draw the tornado funnel at current position
          if (
            !tornado.warning &&
            tornado.progress >= 0 &&
            tornado.progress <= 1.1
          ) {
            const tx = (tornado.posX - cx) * zoom;
            const ty = (tornado.posY - cy) * zoom;
            const funnelH = Math.max(30, 60 * zoom);
            const funnelTopW = Math.max(20, 40 * zoom);
            const funnelBotW = Math.max(5, 8 * zoom);
            const spinAngle = now * 0.008;
            ctx.save();
            ctx.globalAlpha = 0.85;
            // Outer funnel shadow
            ctx.shadowColor = "#333355";
            ctx.shadowBlur = 20;
            // Draw layered funnel (dark grey spinning cone)
            for (let layer = 0; layer < 5; layer++) {
              const lp = layer / 5;
              const lw = funnelTopW * (1 - lp * 0.75);
              const ly = ty - funnelH * lp;
              const spinOff = Math.sin(spinAngle + layer * 1.2) * lw * 0.4;
              ctx.beginPath();
              ctx.ellipse(tx + spinOff, ly, lw, lw * 0.28, 0, 0, Math.PI * 2);
              const alpha2 = 0.55 - lp * 0.2;
              ctx.fillStyle = `rgba(55,50,70,${alpha2})`;
              ctx.fill();
            }
            // Bottom tip
            ctx.fillStyle = "rgba(40,35,55,0.9)";
            ctx.beginPath();
            ctx.ellipse(
              tx,
              ty,
              funnelBotW,
              funnelBotW * 0.4,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            // Rotating debris ring
            ctx.strokeStyle = "rgba(100,90,130,0.6)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
              tx,
              ty - funnelH * 0.5,
              funnelTopW * 0.8,
              spinAngle,
              spinAngle + Math.PI * 1.5,
            );
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
          }
        }
      }

      // ── Atom Bombs ───────────────────────────────────────────────────────────
      {
        const bombs = stateRef.current.atomBombs;
        if (bombs && bombs.length > 0) {
          for (const bomb of bombs) {
            const bsx = (bomb.x - cx) * zoom;
            const bsy = (bomb.y - cy) * zoom;
            if (bsx < -80 || bsx > W + 80 || bsy < -80 || bsy > H + 80) {
              if (!bomb.exploded) continue;
            }

            if (bomb.exploded && bomb.explodedAt) {
              // Explosion animation: expanding ring
              const age = now - bomb.explodedAt;
              const ringR = age / 5;
              const alpha = Math.max(0, 1 - age / 2500);
              ctx.save();
              ctx.globalAlpha = alpha * 0.7;
              ctx.strokeStyle = "rgba(255,80,0,0.8)";
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.arc(bsx, bsy, ringR, 0, Math.PI * 2);
              ctx.stroke();
              ctx.strokeStyle = "rgba(255,220,0,0.5)";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(bsx, bsy, ringR * 0.6, 0, Math.PI * 2);
              ctx.stroke();
              // Mushroom cloud emoji
              ctx.globalAlpha = alpha;
              ctx.font = `${Math.min(40, 20 + age / 80)}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("🍄", bsx, bsy - ringR * 0.4);
              ctx.restore();
            } else if (!bomb.exploded) {
              // Draw trail line from launch origin
              const lsx = (bomb.launchX - cx) * zoom;
              const lsy = (bomb.launchY - cy) * zoom;
              ctx.save();
              ctx.globalAlpha = 0.3;
              ctx.strokeStyle = "#ff8800";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([5, 8]);
              ctx.beginPath();
              ctx.moveTo(lsx, lsy);
              ctx.lineTo(bsx, bsy);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.globalAlpha = 1;

              // Pulsing orange glow ring
              const pulseR = 20 + Math.sin(now / 150) * 8;
              ctx.beginPath();
              ctx.arc(bsx, bsy, pulseR, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(255,140,0,0.8)";
              ctx.lineWidth = 3;
              ctx.stroke();

              // Inner red core
              ctx.beginPath();
              ctx.arc(bsx, bsy, 10, 0, Math.PI * 2);
              ctx.fillStyle = "rgba(255,50,0,0.9)";
              ctx.fill();

              // ☢️ emoji
              ctx.font = "16px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("☢️", bsx, bsy);

              // Target line (faint)
              const tsx = (bomb.targetX - cx) * zoom;
              const tsy = (bomb.targetY - cy) * zoom;
              ctx.globalAlpha = 0.2;
              ctx.strokeStyle = "#ff4400";
              ctx.lineWidth = 1;
              ctx.setLineDash([3, 10]);
              ctx.beginPath();
              ctx.moveTo(bsx, bsy);
              ctx.lineTo(tsx, tsy);
              ctx.stroke();
              ctx.setLineDash([]);

              // Label
              ctx.globalAlpha = 0.9;
              ctx.font = "bold 9px sans-serif";
              ctx.textAlign = "center";
              ctx.fillStyle = "#ff8800";
              ctx.strokeStyle = "rgba(0,0,0,0.8)";
              ctx.lineWidth = 2;
              ctx.strokeText(`☢ → ${bomb.targetPlayerName}`, bsx, bsy - 22);
              ctx.fillText(`☢ → ${bomb.targetPlayerName}`, bsx, bsy - 22);

              ctx.restore();
            }
          }
        }
      }

      // ── Spy Planes ──────────────────────────────────────────────────────────
      {
        const planes = stateRef.current.activeSpyPlanes;
        const myUsername = stateRef.current.localUsername;
        if (planes && planes.length > 0) {
          for (const plane of planes) {
            const psx = (plane.x - cx) * zoom;
            const psy = (plane.y - cy) * zoom;
            // Skip if off screen
            if (psx < -100 || psx > W + 100 || psy < -100 || psy > H + 100)
              continue;

            const isOwn = plane.ownerUsername === myUsername;
            const fadeRatio = Math.max(
              0,
              Math.min(1, (plane.expiresAt - now) / (10 * 1000)),
            );
            const alpha = plane.active ? 1 : fadeRatio;
            if (alpha <= 0) continue;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(psx, psy);
            ctx.rotate(plane.angle + Math.PI / 4); // point direction of travel

            // Draw plane emoji
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `${Math.max(14, 14 * zoom)}px sans-serif`;
            ctx.fillText("🛩", 0, 0);
            ctx.restore();

            // Reveal radius circle for own spy planes
            if (isOwn && plane.active) {
              const revealR = 5000 * zoom;
              ctx.save();
              ctx.globalAlpha = alpha * 0.12;
              ctx.beginPath();
              ctx.arc(psx, psy, revealR, 0, Math.PI * 2);
              ctx.fillStyle = "rgba(0,200,255,0.15)";
              ctx.fill();
              ctx.globalAlpha = alpha * 0.5;
              ctx.strokeStyle = "rgba(0,200,255,0.5)";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([6, 6]);
              ctx.beginPath();
              ctx.arc(psx, psy, revealR, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.restore();

              // Label
              ctx.save();
              ctx.globalAlpha = alpha * 0.8;
              ctx.font = "bold 9px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              ctx.fillStyle = "#00eeff";
              ctx.strokeStyle = "rgba(0,0,0,0.6)";
              ctx.lineWidth = 2;
              const timeLeft = Math.max(
                0,
                Math.ceil((plane.expiresAt - now) / 1000),
              );
              ctx.strokeText(`🛩 ${timeLeft}s`, psx, psy - 16);
              ctx.fillText(`🛩 ${timeLeft}s`, psx, psy - 16);
              ctx.restore();
            }
          }
        }
      }

      // ── Scout Mission Planes ──────────────────────────────────────────────────
      {
        const scouts = stateRef.current.scoutMissions;
        const myPlayer2 = stateRef.current.myPlayer;
        if (scouts && scouts.length > 0 && myPlayer2) {
          for (const mission of scouts) {
            if (mission.phase === "complete" || mission.phase === "intercepted")
              continue;

            const FLIGHT_DURATION = 8000;
            const elapsed = now - mission.startedAt;
            const progress = Math.min(1, elapsed / FLIGHT_DURATION);

            // Determine current position based on phase
            let planeX: number;
            let planeY: number;
            let angle: number;

            if (mission.phase === "outbound") {
              planeX =
                mission.fromX + (mission.targetX - mission.fromX) * progress;
              planeY =
                mission.fromY + (mission.targetY - mission.fromY) * progress;
              angle = Math.atan2(
                mission.targetY - mission.fromY,
                mission.targetX - mission.fromX,
              );
            } else {
              // returning
              const retProgress = Math.min(
                1,
                (now - (mission.startedAt + FLIGHT_DURATION)) / FLIGHT_DURATION,
              );
              planeX =
                mission.targetX +
                (mission.fromX - mission.targetX) * retProgress;
              planeY =
                mission.targetY +
                (mission.fromY - mission.targetY) * retProgress;
              angle = Math.atan2(
                mission.fromY - mission.targetY,
                mission.fromX - mission.targetX,
              );
            }

            const psx = (planeX - cx) * zoom;
            const psy = (planeY - cy) * zoom;
            if (psx < -100 || psx > W + 100 || psy < -100 || psy > H + 100)
              continue;

            // Draw dashed path line
            const fromSx = (mission.fromX - cx) * zoom;
            const fromSy = (mission.fromY - cy) * zoom;
            const toSx = (mission.targetX - cx) * zoom;
            const toSy = (mission.targetY - cy) * zoom;
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = "#00eeff";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(fromSx, fromSy);
            ctx.lineTo(toSx, toSy);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Draw scout plane
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.translate(psx, psy);
            ctx.rotate(angle + Math.PI / 4);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `${Math.max(13, 13 * zoom)}px sans-serif`;
            ctx.fillText("🛩", 0, 0);
            ctx.restore();

            // Label
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.font = "bold 8px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = "#00eeff";
            ctx.strokeStyle = "rgba(0,0,0,0.7)";
            ctx.lineWidth = 2;
            const scoutLabel =
              mission.phase === "outbound"
                ? `→ ${mission.targetUsername}`
                : `← ${mission.targetUsername}`;
            ctx.strokeText(scoutLabel, psx, psy - 12);
            ctx.fillText(scoutLabel, psx, psy - 12);
            ctx.restore();
          }
        }
      }

      // ── World border
      ctx.strokeStyle = "rgba(100,160,40,0.7)";
      ctx.lineWidth = 4;
      ctx.strokeRect(
        -cx * zoom,
        -cy * zoom,
        WORLD_SIZE * zoom,
        WORLD_SIZE * zoom,
      );

      // ── Edge indicators for off-screen player bases and clan HQs
      {
        const MARGIN = 20;
        const ARROW = 8;
        const drawEdgeArrow = (
          worldX2: number,
          worldY2: number,
          label: string,
          color: string,
        ) => {
          const sx2 = (worldX2 - cx) * zoom;
          const sy2 = (worldY2 - cy) * zoom;
          if (sx2 >= 0 && sx2 <= W && sy2 >= 0 && sy2 <= H) return; // in viewport

          const centerX = W / 2;
          const centerY = H / 2;
          const angle = Math.atan2(sy2 - centerY, sx2 - centerX);

          // Clamp to edge
          let ex = centerX + Math.cos(angle) * (W / 2 - MARGIN);
          let ey = centerY + Math.sin(angle) * (H / 2 - MARGIN);
          // Clamp to rectangle
          const clampScale = Math.min(
            Math.abs((W / 2 - MARGIN) / (sx2 - centerX || 0.001)),
            Math.abs((H / 2 - MARGIN) / (sy2 - centerY || 0.001)),
          );
          ex = centerX + (sx2 - centerX) * clampScale;
          ey = centerY + (sy2 - centerY) * clampScale;
          ex = Math.max(MARGIN, Math.min(W - MARGIN, ex));
          ey = Math.max(MARGIN, Math.min(H - MARGIN, ey));

          ctx.save();
          ctx.globalAlpha = 0.75;
          ctx.translate(ex, ey);
          ctx.rotate(angle);

          // Arrow triangle
          ctx.beginPath();
          ctx.moveTo(ARROW + 2, 0);
          ctx.lineTo(-ARROW, -ARROW * 0.6);
          ctx.lineTo(-ARROW, ARROW * 0.6);
          ctx.closePath();
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.fill();

          ctx.rotate(-angle);
          ctx.fillStyle = "#000";
          ctx.font = "bold 8px sans-serif";
          ctx.textAlign = "center";
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(0,0,0,0.9)";
          ctx.strokeText(label, 0, -ARROW - 3);
          ctx.fillStyle = color;
          ctx.fillText(label, 0, -ARROW - 3);
          ctx.restore();
        };

        // Player base arrows
        const allPlayersForArrows = [...ps];
        if (mp && !allPlayersForArrows.find((p) => p.username === mp.username))
          allPlayersForArrows.push(mp);
        for (const player of allPlayersForArrows) {
          const playerClanForArrow = cl.find((c) =>
            c.memberUsernames.includes(player.username),
          );
          const arrowColor =
            player.username === mp?.username
              ? "#ffffff"
              : playerClanForArrow?.color || "#aaaaaa";
          drawEdgeArrow(
            player.posX,
            player.posY,
            player.username.slice(0, 8),
            arrowColor,
          );
        }

        // Clan HQ arrows
        for (const clan2 of cl) {
          if (!clan2.hqPos || (clan2.hqHp ?? 0) <= 0) continue;
          drawEdgeArrow(clan2.hqPos.x, clan2.hqPos.y, "HQ", clan2.color);
        }
      }

      // ── Night overlay
      if (ph === "night") {
        ctx.fillStyle = "rgba(0, 0, 30, 0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        const starRng = seededRandom(77);
        for (let i = 0; i < 80; i++) {
          const blink = Math.sin(now * 0.001 + i) > 0.7 ? 1 : 0.3;
          ctx.globalAlpha = blink * 0.7;
          ctx.fillRect(starRng() * W, starRng() * H, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
      }

      // ── Dragon fire beams
      for (const beam of dragonFireBeams.current) {
        const elapsed = now - beam.startTime;
        if (elapsed > 1200) continue;
        const progress = elapsed / 1200;
        const alpha = 1 - progress;
        const bfx = (beam.fromX - cx) * zoom;
        const bfy = (beam.fromY - cy) * zoom;
        const btx = (beam.toX - cx) * zoom;
        const bty = (beam.toY - cy) * zoom;
        try {
          const grad = ctx.createLinearGradient(bfx, bfy, btx, bty);
          grad.addColorStop(0, `rgba(220,50,255,${alpha})`);
          grad.addColorStop(0.3, `rgba(255,120,0,${alpha})`);
          grad.addColorStop(0.7, `rgba(255,50,0,${alpha * 0.8})`);
          grad.addColorStop(1, `rgba(255,200,0,${alpha * 0.5})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 4 + 6 * (1 - progress);
          ctx.shadowColor = "#ff6600";
          ctx.shadowBlur = 18;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(bfx, bfy);
          ctx.lineTo(btx, bty);
          ctx.stroke();
          // Inner bright core
          ctx.strokeStyle = `rgba(255,255,180,${alpha * 0.9})`;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(bfx, bfy);
          ctx.lineTo(btx, bty);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } catch {
          /* ignore */
        }
      }

      // ── Dragon floating damage numbers
      for (const dmg of dragonFloatingDamage.current) {
        const elapsed = now - dmg.startTime;
        if (elapsed > 2000) continue;
        const progress = elapsed / 2000;
        const alpha = 1 - progress;
        const dx = (dmg.x - cx) * zoom;
        const dy = (dmg.y - cy) * zoom - 20 * progress;
        ctx.globalAlpha = alpha;
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ff4400";
        ctx.strokeStyle = "#1a0000";
        ctx.lineWidth = 3;
        ctx.strokeText(dmg.text, dx, dy);
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(dmg.text, dx, dy);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
      };
      resize();
      window.addEventListener("resize", resize);
      rafRef.current = requestAnimationFrame(draw);

      // Wheel zoom
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.85 : 1.15;
        const newZoom = Math.max(
          0.02,
          Math.min(3, (cameraRef.current.zoom || 1) * delta),
        );
        // Zoom toward mouse position
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const oldZoom = cameraRef.current.zoom || 1;
        cameraRef.current.zoom = newZoom;
        // Adjust camera so world point under mouse stays fixed
        cameraRef.current.x += mouseX / oldZoom - mouseX / newZoom;
        cameraRef.current.y += mouseY / oldZoom - mouseY / newZoom;
        clampCamera(canvas);
      };
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(rafRef.current);
        canvas.removeEventListener("wheel", handleWheel);
      };
    }, [draw, clampCamera]);

    const startDrag = useCallback((x: number, y: number) => {
      dragRef.current = {
        active: true,
        lastX: x,
        lastY: y,
        startX: x,
        startY: y,
        moved: false,
      };
    }, []);

    const moveDrag = useCallback(
      (x: number, y: number) => {
        const d = dragRef.current;
        if (!d.active) return;
        const dx = x - d.lastX;
        const dy = y - d.lastY;
        const moved = Math.abs(x - d.startX) > 5 || Math.abs(y - d.startY) > 5;
        d.moved = d.moved || moved;
        d.lastX = x;
        d.lastY = y;
        const _pz = cameraRef.current.zoom || 1;
        cameraRef.current.x -= dx / _pz;
        cameraRef.current.y -= dy / _pz;
        const canvas = canvasRef.current;
        if (canvas) clampCamera(canvas);
        onCameraChange?.(cameraRef.current.x, cameraRef.current.y);
      },
      [clampCamera, onCameraChange],
    );

    const endDrag = useCallback(
      (clientX: number, clientY: number) => {
        const d = dragRef.current;
        if (!d.active) return;
        d.active = false;

        if (!d.moved) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const screenX = clientX - rect.left;
          const screenY = clientY - rect.top;
          const _zoom = cameraRef.current.zoom || 1;
          const worldX = screenX / _zoom + cameraRef.current.x;
          const worldY = screenY / _zoom + cameraRef.current.y;

          const {
            players: ps,
            myPlayer: mp,
            clans: cl,
            resources: res,
            attackMode,
            bossNPC: boss,
            npcBases: npcList,
            dragons: dragonList2,
          } = stateRef.current;

          // HQ tap detection
          if (onHQTap || onAttackClanHQ) {
            for (const clan of cl) {
              if (!clan.hqPos || (clan.hqHp || 0) <= 0) continue;
              const dist = Math.sqrt(
                (worldX - clan.hqPos.x) ** 2 + (worldY - clan.hqPos.y) ** 2,
              );
              if (dist < 30) {
                if (attackMode && onAttackClanHQ) {
                  const isMine = clan.memberUsernames.includes(
                    mp?.username || "",
                  );
                  if (!isMine) {
                    onAttackClanHQ(clan.id, 500);
                    return;
                  }
                } else if (onHQTap) {
                  onHQTap(clan);
                  return;
                }
              }
            }
          }

          // Non-attack mode: tap player base to view/invite
          if (!attackMode) {
            const allPlayersNonAtk = [...ps];
            if (mp && !allPlayersNonAtk.find((p) => p.username === mp.username))
              allPlayersNonAtk.push(mp);
            for (const player of allPlayersNonAtk) {
              if (player.username === mp?.username) {
                // Tap own base -> open photo upload
                if (
                  Math.abs(player.posX - worldX) < 24 &&
                  Math.abs(player.posY - worldY) < 24
                ) {
                  onOwnBaseTap?.();
                  return;
                }
                continue;
              }
              if (
                Math.abs(player.posX - worldX) < 24 &&
                Math.abs(player.posY - worldY) < 24
              ) {
                onPlayerTap?.(player);
                return;
              }
            }
            return;
          }

          // Boss click
          if (boss && !boss.defeated) {
            if (
              Math.abs(BOSS_X - worldX) < 35 &&
              Math.abs(BOSS_Y - worldY) < 35
            ) {
              onAttackBoss?.();
              return;
            }
          }

          // Resource fields
          for (const field of res) {
            if (
              Math.abs(field.x - worldX) < 22 &&
              Math.abs(field.y - worldY) < 22
            ) {
              onAttackResource(field);
              return;
            }
          }

          // Dragons
          if (dragonList2 && attackMode) {
            for (const dragon of dragonList2) {
              if (!dragon.isAlive) continue;
              const dist = Math.sqrt(
                (worldX - dragon.posX) ** 2 + (worldY - dragon.posY) ** 2,
              );
              if (dist < 36) {
                onAttackDragon?.(dragon);
                return;
              }
            }
          }

          // NPC bases
          if (npcList) {
            for (const npcBase of npcList) {
              if (npcBase.hp <= 0) continue;
              if (
                Math.abs(npcBase.posX - worldX) < 26 &&
                Math.abs(npcBase.posY - worldY) < 26
              ) {
                onAttackNPCBase?.(npcBase);
                return;
              }
            }
          }

          // Pond Troll tap
          if (onTrollTap) {
            const trollList = stateRef.current.pondTrolls;
            if (trollList) {
              for (const troll of trollList) {
                if (!troll.alive) continue;
                const dist = Math.sqrt(
                  (worldX - troll.x) ** 2 + (worldY - troll.y) ** 2,
                );
                if (dist < 40) {
                  onTrollTap(troll.id);
                  return;
                }
              }
            }
          }

          // Player bases
          const allPlayers = [...ps];
          if (mp && !allPlayers.find((p) => p.username === mp.username))
            allPlayers.push(mp);
          for (const player of allPlayers) {
            if (player.username === mp?.username) continue;
            if (
              Math.abs(player.posX - worldX) < 24 &&
              Math.abs(player.posY - worldY) < 24
            ) {
              onAttackBase(player);
              return;
            }
          }

          // No entity hit — fire onMapClick for click-to-warp
          onMapClick?.(worldX, worldY);
        }
      },
      [
        onAttackBase,
        onAttackResource,
        onAttackBoss,
        onHQTap,
        onAttackNPCBase,
        onAttackDragon,
        onAttackClanHQ,
        onPlayerTap,
        onOwnBaseTap,
        onTrollTap,
        onMapClick,
      ],
    );

    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
        onMouseUp={(e) => endDrag(e.clientX, e.clientY)}
        onMouseLeave={() => {
          dragRef.current.active = false;
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          if (e.touches.length === 2) {
            const dx2 = e.touches[0].clientX - e.touches[1].clientX;
            const dy2 = e.touches[0].clientY - e.touches[1].clientY;
            pinchRef.current = {
              active: true,
              lastDist: Math.sqrt(dx2 * dx2 + dy2 * dy2),
            };
          } else {
            pinchRef.current.active = false;
            const t = e.touches[0];
            startDrag(t.clientX, t.clientY);
          }
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          if (e.touches.length === 2 && pinchRef.current.active) {
            const dx2 = e.touches[0].clientX - e.touches[1].clientX;
            const dy2 = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            const ratio = dist / (pinchRef.current.lastDist || dist);
            pinchRef.current.lastDist = dist;
            const canvas = canvasRef.current;
            const newZoom = Math.max(
              0.02,
              Math.min(3, (cameraRef.current.zoom || 1) * ratio),
            );
            cameraRef.current.zoom = newZoom;
            if (canvas) clampCamera(canvas);
          } else if (!pinchRef.current.active) {
            const t = e.touches[0];
            moveDrag(t.clientX, t.clientY);
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          if (e.touches.length < 2) pinchRef.current.active = false;
          const t = e.changedTouches[0];
          endDrag(t.clientX, t.clientY);
        }}
      />
    );
  },
);
