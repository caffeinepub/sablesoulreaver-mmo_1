import React, { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useDayNight } from "../hooks/useDayNight";
import type { CaptureResult } from "../hooks/useGameState";
import type {
  AtomBomb,
  AttackFlash,
  AttackLogEntry,
  AttackNotification as AttackNotifType,
  BossState,
  ChatMessage,
  ClanUpgrades,
  DragonNPC,
  GamePlayer,
  HealingEntry,
  LocalClan,
  MarchingArmy,
  NPCBase,
  NightThugState,
  NuclearBlast,
  ResourceField,
  SpyPlane,
  TeleportCharge,
  TerritoryCell,
  TroopCounts,
  UpgradeState,
} from "../types/game";

interface ClanInvite {
  id: string;
  fromUsername: string;
  clanId: string;
  clanName: string;
  clanColor: string;
  timestamp: number;
}
import { playClash, playExplosion, playJetSound } from "../utils/warSounds";
import { AdminPanel } from "./AdminPanel";
import { AllAttacksPanel } from "./AllAttacksPanel";
import { AttackNotification } from "./AttackNotification";
import { BattleWindow } from "./BattleWindow";
import { ChatBox } from "./ChatBox";
import { ClanChatPanel } from "./ClanChatPanel";
import { ClanHQPanel } from "./ClanHQPanel";
import { ClanPanel } from "./ClanPanel";
import type { GameCanvasHandle, TornadoRenderState } from "./GameCanvas";
import { GameCanvas, PONDS, TREES } from "./GameCanvas";
import { HospitalPanel } from "./HospitalPanel";
import { MiniMap } from "./MiniMap";
import { ShopPanel } from "./ShopPanel";
import { TeleportPanel } from "./TeleportPanel";
import { TerritoryLeaderboard } from "./TerritoryLeaderboard";
import { TrainingPanel } from "./TrainingPanel";
import { UpgradePanel } from "./UpgradePanel";
import { WarAudioPopup } from "./WarAudioPopup";

interface Props {
  username: string;
  serverId: number;
  players: GamePlayer[];
  myPlayer: GamePlayer | null;
  clans: LocalClan[];
  territory: TerritoryCell[];
  resources: ResourceField[];
  chatMessages: ChatMessage[];
  attackNotifications: AttackNotifType[];
  onSendChat: (msg: string) => void;
  onAttackBase: (player: GamePlayer) => "shielded" | "attacked";
  onAttackResource: (fieldId: string) => CaptureResult;
  onCreateClan: (name: string, color: string) => void;
  onJoinClan: (id: string) => void;
  onSaveGame: () => void;
  onLoadGame: () => boolean;
  onInitResources: () => void;
  attackFlashes: AttackFlash[];
  bossNPC: BossState | null;
  myShieldActive: boolean;
  shieldCooldownUntil: number;
  healingQueue: HealingEntry[];
  upgrades: UpgradeState;
  teleports: TeleportCharge[];
  trainingInterval: number;
  lastTrainingAt: number;
  troops: TroopCounts;
  onUseTeleport: (chargeId: number, x: number, y: number) => boolean;
  onToggleShield: (active: boolean) => void;
  onAttackBoss: (damage: number) => void;
  onUpgradeStructure: (type: string) => void;
  getShareLink: () => string;
  onKickMember: (clanId: string, member: string) => void;
  onLeaveClan: () => void;
  onSetMOTD: (clanId: string, motd: string) => void;
  onPromoteMember: (clanId: string, member: string) => void;
  buildClanHQ: (x: number, y: number) => void;
  teleportClanHQ: (x: number, y: number) => boolean;
  attackClanHQ: (clanId: string, damage: number) => void;
  spendClanPoints: (upgradeKey: keyof ClanUpgrades, cost: number) => void;
  donateGoldForHQPoints: (amount: number) => boolean;
  changeMemberRank: (
    clanId: string,
    targetUsername: string,
    rank: string,
  ) => void;
  clanInvites: ClanInvite[];
  onSendClanInvite: (targetUsername: string) => void;
  onAcceptInvite: (inviteId: string, clanId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
  onDeclareWar: (targetClanId: string) => void;
  onEndWar: (targetClanId: string) => void;
  onGarrisonTroops: (fieldId: string, count: number) => void;
  npcBases?: NPCBase[];
  onAttackNPCBase?: (base: NPCBase) => void;
  onSendAid?: (
    receiver: string,
    wood: number,
    stone: number,
    food: number,
    soldiers: number,
  ) => void;
  onClaimNearbyTiles?: () => "no_clan" | "cooldown" | "claimed";
  claimTileCooldown?: number;
  dragons?: DragonNPC[];
  onAttackDragon?: (dragon: DragonNPC) => void;
  onDragonAutoAttack?: (
    targetType: "player" | "npc" | "npcBase",
    targetId: string,
    damage: number,
  ) => void;
  onUpdateBasePhoto?: (photoUrl: string | null) => void;
  onActivateClanShield?: () => void;
  onThugRaidComplete?: (soldierLoss: number) => void;
  onRelocateNPCBase?: (id: string, x: number, y: number) => void;
  onRespawnDefeatedPlayer?: (playerId: string) => void;
  atomBombs?: AtomBomb[];
  onLaunchAtomBomb?: (targetPlayerId: string) => boolean;
  activeSpyPlanes?: SpyPlane[];
  onDeploySpyPlane?: () => boolean;
  onAddSpyPlanes?: (count: number) => void;
}

// Compact labeled HUD button
function HudBtn({
  onClick,
  label,
  icon,
  active,
  activeColor,
  borderColor,
  iconColor,
  title,
  ocid,
}: {
  onClick: () => void;
  label: string;
  icon: string;
  active?: boolean;
  activeColor?: string;
  borderColor?: string;
  iconColor?: string;
  title?: string;
  ocid?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-14 h-14 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5"
      style={{
        background: active
          ? activeColor || "rgba(200,0,0,0.8)"
          : "rgba(10,20,5,0.92)",
        border: `2px solid ${
          active ? "#ff4444" : borderColor || "rgba(100,200,50,0.4)"
        }`,
        color: active ? "#ff4444" : iconColor || "#7DCF45",
        boxShadow: active ? "0 0 15px rgba(255,0,0,0.4)" : "none",
        fontSize: 20,
      }}
      title={title || label}
      data-ocid={ocid || "game.button"}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span
        style={{
          fontSize: 9,
          lineHeight: 1,
          opacity: 0.85,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </span>
    </button>
  );
}

interface ScoutMission {
  id: string;
  targetId: string;
  targetUsername: string;
  targetX: number;
  targetY: number;
  phase: "outbound" | "returning" | "complete" | "intercepted";
  startedAt: number;
  returnedAt?: number;
  intercepted?: boolean;
  intel?: {
    troops: number;
    tanks: number;
    jets: number;
    wallHp: number;
    maxWallHp: number;
    timestamp: number;
  };
}

function isNPCBase(t: unknown): t is NPCBase {
  return (
    !!t &&
    typeof t === "object" &&
    "memberName" in (t as object) &&
    "troops" in (t as object)
  );
}

function getDisconnectedTiles(
  territory: TerritoryCell[],
  clan: LocalClan | null | undefined,
  cellSz: number,
): Array<{ cellX: number; cellY: number; reconnectDir: string | null }> {
  if (!clan || !clan.hqPos) return [];
  const clanTiles = territory.filter((t) => t.clanId === clan.id);
  if (clanTiles.length === 0) return [];
  const hqCellX = Math.floor(clan.hqPos.x / cellSz);
  const hqCellY = Math.floor(clan.hqPos.y / cellSz);
  const tileSet = new Set(clanTiles.map((t) => `${t.cellX},${t.cellY}`));
  const visited = new Set<string>();
  const queue: Array<{ cellX: number; cellY: number }> = [];
  const hqKey = `${hqCellX},${hqCellY}`;
  if (tileSet.has(hqKey)) {
    queue.push({ cellX: hqCellX, cellY: hqCellY });
    visited.add(hqKey);
  }
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cur.cellX + dx;
      const ny = cur.cellY + dy;
      const nk = `${nx},${ny}`;
      if (!visited.has(nk) && tileSet.has(nk)) {
        visited.add(nk);
        queue.push({ cellX: nx, cellY: ny });
      }
    }
  }
  const disconnected = clanTiles.filter(
    (t) => !visited.has(`${t.cellX},${t.cellY}`),
  );

  // Compute reconnect direction for each disconnected tile
  const dirLabels: Record<string, string> = {
    "1,0": "East",
    "-1,0": "West",
    "0,1": "South",
    "0,-1": "North",
  };
  const dirArrows: Record<string, string> = {
    East: "→",
    West: "←",
    South: "↓",
    North: "↑",
  };

  return disconnected.map((tile) => {
    // Check immediate neighbors first
    for (const [dx, dy] of dirs) {
      const nk = `${tile.cellX + dx},${tile.cellY + dy}`;
      if (visited.has(nk)) {
        const label = dirLabels[`${dx},${dy}`];
        return { ...tile, reconnectDir: `${dirArrows[label]} ${label}` };
      }
    }
    // BFS through all clan tiles (including other disconnected) toward any connected tile
    const bfsVisited = new Set<string>();
    const bfsQueue: Array<{
      cellX: number;
      cellY: number;
      firstDir: string | null;
    }> = [{ cellX: tile.cellX, cellY: tile.cellY, firstDir: null }];
    bfsVisited.add(`${tile.cellX},${tile.cellY}`);
    while (bfsQueue.length > 0) {
      const cur = bfsQueue.shift()!;
      for (const [dx, dy] of dirs) {
        const nx = cur.cellX + dx;
        const ny = cur.cellY + dy;
        const nk = `${nx},${ny}`;
        if (bfsVisited.has(nk)) continue;
        bfsVisited.add(nk);
        const firstDir =
          cur.firstDir ??
          (dirLabels[`${dx},${dy}`]
            ? `${dirArrows[dirLabels[`${dx},${dy}`]]} ${dirLabels[`${dx},${dy}`]}`
            : null);
        if (visited.has(nk)) {
          return { ...tile, reconnectDir: firstDir };
        }
        if (tileSet.has(nk)) {
          bfsQueue.push({ cellX: nx, cellY: ny, firstDir });
        }
      }
    }
    // Fall back: point toward HQ
    const angle = Math.atan2(hqCellY - tile.cellY, hqCellX - tile.cellX);
    const deg = (angle * 180) / Math.PI;
    let fallback = "→ East";
    if (deg > -45 && deg <= 45) fallback = "→ East";
    else if (deg > 45 && deg <= 135) fallback = "↓ South";
    else if (deg > -135 && deg <= -45) fallback = "↑ North";
    else fallback = "← West";
    return { ...tile, reconnectDir: fallback };
  });
}

export function GameScreen({
  username,
  serverId,
  players,
  myPlayer,
  clans,
  territory,
  resources,
  chatMessages,
  attackNotifications,
  onSendChat,
  onAttackBase,
  onAttackResource,
  onCreateClan,
  onJoinClan,
  onSaveGame,
  onLoadGame,
  onInitResources,
  attackFlashes,
  bossNPC,
  myShieldActive,
  shieldCooldownUntil,
  healingQueue,
  upgrades,
  teleports,
  trainingInterval,
  lastTrainingAt,
  troops,
  onUseTeleport,
  onToggleShield,
  onAttackBoss,
  onUpgradeStructure,
  getShareLink,
  onKickMember,
  onLeaveClan,
  onSetMOTD,
  onPromoteMember,
  buildClanHQ,
  teleportClanHQ,
  attackClanHQ,
  spendClanPoints,
  donateGoldForHQPoints,
  changeMemberRank,
  clanInvites,
  onSendClanInvite,
  onAcceptInvite,
  onDeclineInvite,
  onDeclareWar,
  onEndWar,
  onGarrisonTroops,
  npcBases,
  onAttackNPCBase,
  onSendAid,
  dragons,
  onAttackDragon,
  onDragonAutoAttack,
  onClaimNearbyTiles,
  claimTileCooldown = 0,
  onUpdateBasePhoto,
  onActivateClanShield,
  onThugRaidComplete,
  onRelocateNPCBase,
  onRespawnDefeatedPlayer,
  atomBombs = [],
  onLaunchAtomBomb,
  activeSpyPlanes = [],
  onDeploySpyPlane,
  onAddSpyPlanes,
}: Props) {
  const WORLD_SIZE_HALF = 50000;
  const { phase } = useDayNight();
  const [attackMode, setAttackMode] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [showTraining, setShowTraining] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showTeleport, setShowTeleport] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [showHQPanel, setShowHQPanel] = useState(false);
  const [hqPanelClanId, setHQPanelClanId] = useState<string | null>(null);
  const [tappedPlayer, setTappedPlayer] = useState<GamePlayer | null>(null);
  const [showSendAid, setShowSendAid] = useState(false);
  const [aidWood, setAidWood] = useState(0);
  const [aidStone, setAidStone] = useState(0);
  const [aidFood, setAidFood] = useState(0);
  const [aidSoldiers, setAidSoldiers] = useState(0);
  const [showDeclareWar, setShowDeclareWar] = useState(false);
  const [showHospital, setShowHospital] = useState(false);
  const [showClanChat, setShowClanChat] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [hasClanDragon, setHasClanDragon] = useState(
    () => localStorage.getItem(`ssmmo_clanDragon_${username}`) === "1",
  );
  const [hasSpecialForces, setHasSpecialForces] = useState(
    () => localStorage.getItem(`ssmmo_specialforces_${serverId}`) === "1",
  );
  const [hasHacker, setHasHacker] = useState(
    () =>
      localStorage.getItem(`ssmmo_hacker_${serverId}`) === "1" ||
      username === "SableSoulreaver",
  );
  const [hackerIsHacking, setHackerIsHacking] = useState(false);
  const [hackerTargetId, setHackerTargetId] = useState<string | null>(null);
  const [hackerStartTime, setHackerStartTime] = useState<number | null>(null);
  const [myShieldHackedUntil, setMyShieldHackedUntil] = useState<number | null>(
    null,
  );
  const [spyPlaneCount, setSpyPlaneCount] = React.useState(
    () => myPlayer?.spyPlanes ?? 0,
  );
  const [antiAirCount, setAntiAirCount] = React.useState(() => {
    const stored = localStorage.getItem(`ssmmo_antiair_${serverId}`);
    if (stored) return Math.min(3, Number.parseInt(stored, 10) || 0);
    return myPlayer?.antiAirCount ?? 0;
  });

  // ── Scout Mission state
  const [scoutMissions, setScoutMissions] = React.useState<ScoutMission[]>([]);
  const [intelReport, setIntelReport] = React.useState<ScoutMission | null>(
    null,
  );
  const [dragonModeActive, setDragonModeActive] = useState(
    () => localStorage.getItem(`ssmmo_dragonMode_${username}`) === "1",
  );
  const toggleDragonMode = React.useCallback(() => {
    setDragonModeActive((prev) => {
      const next = !prev;
      localStorage.setItem(`ssmmo_dragonMode_${username}`, next ? "1" : "0");
      if (next)
        toast.success("ð Dragon Mode ACTIVATED! Your dragon guards the HQ!");
      else toast("ð Dragon Mode deactivated.");
      return next;
    });
  }, [username]);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [localTroops, setLocalTroops] = useState<TroopCounts>(() => troops);
  // Garrison dialog: after resource capture
  const [pendingGarrison, setPendingGarrison] = useState<{
    fieldId: string;
    fieldType: string;
  } | null>(null);

  const viewSize = { w: window.innerWidth, h: window.innerHeight };
  const [externalCamera, setExternalCamera] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [attackTarget, setAttackTarget] = useState<
    GamePlayer | ResourceField | NPCBase | "boss" | null
  >(null);
  const [marchingArmies, setMarchingArmies] = useState<MarchingArmy[]>([]);
  // Territory tile interaction state
  const [tappedTerritoryCell, setTappedTerritoryCell] = React.useState<{
    cellX: number;
    cellY: number;
    clanId: string;
  } | null>(null);
  const [garrisonTileCount, setGarrisonTileCount] = React.useState(100);
  const [localTerritory, setLocalTerritory] = React.useState<typeof territory>(
    [],
  );
  const [activeBattle, setActiveBattle] = useState<{
    attackerName: string;
    defenderName: string;
    battleId: string;
    attackerHp?: number;
    attackerMaxHp?: number;
    defenderHp?: number;
    defenderMaxHp?: number;
    attackerTroops?: number;
    defenderTroops?: number;
  } | null>(null);
  const [nuclearBlasts, setNuclearBlasts] = useState<NuclearBlast[]>([]);
  const marchTimersRef = React.useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const cameraXRef = useRef(WORLD_SIZE_HALF - 400);
  const cameraYRef = useRef(WORLD_SIZE_HALF - 300);
  const gameCanvasRef = useRef<GameCanvasHandle>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tick, setTick] = React.useState(0);
  const prevBossShieldRef = React.useRef<boolean | null>(null);
  const [teleportFlashes, setTeleportFlashes] = useState<
    { id: string; x: number; y: number; username: string; at: number }[]
  >([]);
  const prevPlayerPositionsRef = React.useRef<
    Map<string, { x: number; y: number }>
  >(new Map());

  const defaultThugState: NightThugState = {
    active: false,
    targetPlayerId: null,
    targetUsername: null,
    posX: 0,
    posY: 0,
    raidProgress: 0,
    despawning: false,
    spawnedAt: 0,
    reachedAt: null,
  };
  const [nightThugs, setNightThugs] =
    useState<NightThugState>(defaultThugState);
  const thugsSpawnedThisNightRef = React.useRef(false);
  const prevPhaseRef = React.useRef<"day" | "night">("day");

  // ── Pond Trolls state
  const [pondTrolls, setPondTrolls] = React.useState<
    Array<{
      id: string;
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      alive: boolean;
      respawnAt?: number;
    }>
  >(() => {
    // Match PONDS positions from GameCanvas (same seeded RNG)
    function seededRng(seed: number) {
      let s = seed;
      return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
      };
    }
    const rng = seededRng(42);
    // Skip TREES iterations (45 trees × 3 calls = 135)
    for (let i = 0; i < 45 * 3; i++) rng();
    const trolls: Array<{
      id: string;
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      alive: boolean;
    }> = [];
    for (let i = 0; i < 10; i++) {
      const x = 4000 + rng() * (100000 - 8000);
      const y = 4000 + rng() * (100000 - 8000);
      trolls.push({
        id: `troll_${i}`,
        x,
        y,
        hp: 15000,
        maxHp: 15000,
        alive: true,
      });
    }
    return trolls;
  });
  const [selectedTrollId, setSelectedTrollId] = React.useState<string | null>(
    null,
  );

  // ── Sky Jets state
  const [skyJets, setSkyJets] = React.useState<
    Array<{
      id: string;
      x: number;
      y: number;
      angle: number;
      progress: number;
      hasBomb: boolean;
      bombX?: number;
      bombY?: number;
      bombProgress?: number;
      // internal
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      speed: number;
    }>
  >([]);
  const jetIdRef = React.useRef(0);
  const nextJetSpawnRef = React.useRef(Date.now() + 5000);

  // ── Rain / Weather state
  const [inGameDay, setInGameDay] = React.useState(1);
  const [isRaining, setIsRaining] = React.useState(false);
  const rainEndRef = React.useRef<number>(0);
  const lastDayTickRef = React.useRef<number>(Date.now());

  // ── Tornado state
  const [tornadoRender, setTornadoRender] =
    React.useState<TornadoRenderState | null>(null);
  const nextTornadoRef = React.useRef<number>(Date.now() + 20 * 60 * 1000);
  const tornadoActiveRef = React.useRef(false);
  const [destroyedTreeIndices, setDestroyedTreeIndices] = React.useState<
    number[]
  >([]);
  const [destroyedPondIndices, setDestroyedPondIndices] = React.useState<
    number[]
  >([]);
  const [hasTornadoShelter, setHasTornadoShelter] = React.useState(false);

  // ── Attack Log state
  const [attackLog, setAttackLog] = React.useState<AttackLogEntry[]>([]);
  const [showAttackLog, setShowAttackLog] = React.useState(false);
  const [showKDScoreboard, setShowKDScoreboard] = React.useState(false);
  const [showDisconnectedTiles, setShowDisconnectedTiles] =
    React.useState(false);
  // Feature 8: Reinforce HQ state
  const [showReinforceHQ, setShowReinforceHQ] = React.useState(false);
  const [reinforceClanId, setReinforceClanId] = React.useState<string | null>(
    null,
  );
  const [reinforceCount, setReinforceCount] = React.useState(500);

  // Click-to-claim empty tile popup
  const [claimPopup, setClaimPopup] = React.useState<{
    worldX: number;
    worldY: number;
    cellX: number;
    cellY: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // ── Global marches (shared state between all players via localStorage)
  const [globalMarches, setGlobalMarches] = React.useState<MarchingArmy[]>([]);

  // Tick for live countdown refresh + sync globalMarches from localStorage
  React.useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      // Sync globalMarches from localStorage (shared state)
      try {
        const raw = localStorage.getItem("ssmmo_globalMarches");
        if (raw) {
          const parsed: MarchingArmy[] = JSON.parse(raw);
          const now = Date.now();
          // Filter out expired marches (more than 1 min past their duration)
          const active = parsed.filter(
            (m) => now - m.startTime < m.duration + 60000,
          );
          setGlobalMarches(active);
        } else {
          setGlobalMarches([]);
        }
      } catch {
        // ignore parse errors
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Boss shield state change notifications
  React.useEffect(() => {
    void tick; // re-run every second to detect shield state changes
    if (!bossNPC || bossNPC.defeated) {
      prevBossShieldRef.current = null;
      return;
    }
    const now = Date.now();
    const shieldCurrentlyUp = bossNPC.shieldCooldownUntil <= now;

    if (prevBossShieldRef.current === true && !shieldCurrentlyUp) {
      toast.error(
        "\u2694\uFE0F WORLD EVENT: BOSS SHIELD IS DOWN! Attack NOW before it recharges!",
        {
          duration: 8000,
          style: {
            background: "#1a0020",
            border: "2px solid #ff00aa",
            color: "#ff88ff",
          },
        },
      );
    }
    if (prevBossShieldRef.current === false && shieldCurrentlyUp) {
      toast(
        "\uD83D\uDC51 WORLD EVENT: The Boss has reactivated its shield! Prepare your forces.",
        {
          duration: 6000,
          style: {
            background: "#0a0020",
            border: "2px solid #9900cc",
            color: "#cc88ff",
          },
        },
      );
    }
    prevBossShieldRef.current = shieldCurrentlyUp;
  }, [bossNPC, tick]);

  // Sync localTroops from props
  React.useEffect(() => {
    setLocalTroops(troops);
  }, [troops]);

  // Sync localTerritory from props
  React.useEffect(() => {
    setLocalTerritory(territory);
  }, [territory]);

  // ── Pond Troll aggro check every 30-60s
  React.useEffect(() => {
    const TROLL_AGGRO_DIST = 3 * 500; // 3 "tiles" (500 units each)
    const interval = setInterval(
      () => {
        if (!myPlayer) return;
        setPondTrolls((prev) => {
          let changed = false;
          const next = prev.map((troll) => {
            // Respawn check
            if (
              !troll.alive &&
              troll.respawnAt &&
              Date.now() >= troll.respawnAt
            ) {
              changed = true;
              return {
                ...troll,
                alive: true,
                hp: troll.maxHp,
                respawnAt: undefined,
              };
            }
            return troll;
          });
          if (changed) return next;
          return prev;
        });
        setPondTrolls((prev) => {
          for (const troll of prev) {
            if (!troll.alive) continue;
            const dist = Math.sqrt(
              (myPlayer.posX - troll.x) ** 2 + (myPlayer.posY - troll.y) ** 2,
            );
            if (dist < TROLL_AGGRO_DIST) {
              const dmg = 200 + Math.floor(Math.random() * 300);
              toast.error(
                `\uD83E\uDDCC Pond Troll attacks ${myPlayer.username}'s base! -${dmg} HP`,
                { duration: 3000 },
              );
            }
          }
          return prev;
        });
      },
      30000 + Math.random() * 30000,
    );
    return () => clearInterval(interval);
  }, [myPlayer]);

  // ── Sky jets animation tick
  React.useEffect(() => {
    const WORLD_SIZE = 100000;
    const interval = setInterval(() => {
      const now = Date.now();
      setSkyJets((prev) => {
        // Update existing jets
        const updated = prev
          .map((jet) => {
            const newProg = jet.progress + jet.speed;
            const nx = jet.startX + (jet.endX - jet.startX) * newProg;
            const ny = jet.startY + (jet.endY - jet.startY) * newProg;
            let bombProgress = jet.bombProgress;
            if (jet.hasBomb && bombProgress !== undefined) {
              bombProgress = Math.min(1, bombProgress + 0.06);
            }
            return { ...jet, x: nx, y: ny, progress: newProg, bombProgress };
          })
          .filter((j) => j.progress < 1.2);

        // Spawn new jet if needed
        if (now >= nextJetSpawnRef.current) {
          nextJetSpawnRef.current = now + 15000 + Math.random() * 10000;
          const id = `jet_${jetIdRef.current++}`;
          const side = Math.floor(Math.random() * 4);
          let startX = 0;
          let startY = 0;
          let endX = 0;
          let endY = 0;
          const cx = WORLD_SIZE / 2 + (Math.random() - 0.5) * 20000;
          const cy = WORLD_SIZE / 2 + (Math.random() - 0.5) * 20000;
          if (side === 0) {
            startX = -2000;
            startY = cy;
            endX = WORLD_SIZE + 2000;
            endY = cy + (Math.random() - 0.5) * 10000;
          } else if (side === 1) {
            startX = WORLD_SIZE + 2000;
            startY = cy;
            endX = -2000;
            endY = cy + (Math.random() - 0.5) * 10000;
          } else if (side === 2) {
            startX = cx;
            startY = -2000;
            endX = cx + (Math.random() - 0.5) * 10000;
            endY = WORLD_SIZE + 2000;
          } else {
            startX = cx;
            startY = WORLD_SIZE + 2000;
            endX = cx + (Math.random() - 0.5) * 10000;
            endY = -2000;
          }
          const dx = endX - startX;
          const dy = endY - startY;
          const angle = Math.atan2(dy, dx);
          const hasBomb = Math.random() < 0.4;
          const bombX = hasBomb
            ? startX + dx * (0.3 + Math.random() * 0.4)
            : undefined;
          const bombY = hasBomb
            ? startY + dy * (0.3 + Math.random() * 0.4)
            : undefined;
          const newJet = {
            id,
            startX,
            startY,
            endX,
            endY,
            angle,
            x: startX,
            y: startY,
            progress: 0,
            speed: 0.003 + Math.random() * 0.002,
            hasBomb,
            bombX,
            bombY,
            bombProgress: hasBomb ? 0 : undefined,
          };
          return [...updated, newJet];
        }
        return updated;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // ── Rain logic: every 5 in-game days (1 day = 5 real minutes)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Check if rain should end
      if (isRaining && now >= rainEndRef.current) {
        setIsRaining(false);
        return;
      }
      // Increment day every 5 real minutes
      if (now - lastDayTickRef.current >= 5 * 60 * 1000) {
        lastDayTickRef.current = now;
        setInGameDay((prev) => {
          const nextDay = prev + 1;
          if (nextDay % 5 === 0 && !isRaining) {
            // Trigger rain for 60 seconds
            setIsRaining(true);
            rainEndRef.current = now + 60000;
            toast("🌧 Rainy Day! Rain will last for 60 seconds.", {
              duration: 8000,
              style: {
                background: "rgba(10,20,60,0.95)",
                border: "2px solid #4466cc",
                color: "#aaccff",
              },
            });
          }
          return nextDay;
        });
      }
    }, 10000); // check every 10s
    return () => clearInterval(interval);
  }, [isRaining]);

  // ── Tornado logic: spawn every 20 real minutes
  React.useEffect(() => {
    const WORLD_SIZE = 100000;
    const TORNADO_PATH_WIDTH = 2500;
    const TORNADO_TRAVEL_MS = 9000; // ~9 seconds to cross

    const interval = setInterval(() => {
      const now = Date.now();
      if (tornadoActiveRef.current) return;
      if (now < nextTornadoRef.current) return;

      tornadoActiveRef.current = true;

      // Pick random edge to spawn from and opposite edge destination
      const edge = Math.floor(Math.random() * 4);
      let startX = 0;
      let startY = 0;
      let endX = 0;
      let endY = 0;
      const midOffset = 10000 + Math.random() * (WORLD_SIZE - 20000);
      if (edge === 0) {
        // top → bottom
        startX = midOffset;
        startY = -2000;
        endX = midOffset + (Math.random() - 0.5) * 8000;
        endY = WORLD_SIZE + 2000;
      } else if (edge === 1) {
        // bottom → top
        startX = midOffset;
        startY = WORLD_SIZE + 2000;
        endX = midOffset + (Math.random() - 0.5) * 8000;
        endY = -2000;
      } else if (edge === 2) {
        // left → right
        startX = -2000;
        startY = midOffset;
        endX = WORLD_SIZE + 2000;
        endY = midOffset + (Math.random() - 0.5) * 8000;
      } else {
        // right → left
        startX = WORLD_SIZE + 2000;
        startY = midOffset;
        endX = -2000;
        endY = midOffset + (Math.random() - 0.5) * 8000;
      }

      // 5-second warning
      setTornadoRender({
        warning: true,
        pathStartX: startX,
        pathStartY: startY,
        pathEndX: endX,
        pathEndY: endY,
        pathWidth: TORNADO_PATH_WIDTH,
        posX: startX,
        posY: startY,
        progress: -1,
      });

      toast("🌪 TORNADO WARNING — Take Cover!", {
        duration: 5000,
        style: {
          background: "rgba(60,30,0,0.95)",
          border: "2px solid #ff8800",
          color: "#ffcc44",
          fontWeight: "bold",
        },
      });

      // After 5 seconds, start tornado movement
      setTimeout(() => {
        const tornadoStart = Date.now();
        const tickInterval = setInterval(() => {
          const elapsed = Date.now() - tornadoStart;
          const progress = Math.min(1, elapsed / TORNADO_TRAVEL_MS);
          const posX = startX + (endX - startX) * progress;
          const posY = startY + (endY - startY) * progress;

          setTornadoRender({
            warning: false,
            pathStartX: startX,
            pathStartY: startY,
            pathEndX: endX,
            pathEndY: endY,
            pathWidth: TORNADO_PATH_WIDTH,
            posX,
            posY,
            progress,
          });

          // Apply damage to bases/fields in path
          if (myPlayer) {
            // Check player base
            const pathDx = endX - startX;
            const pathDy = endY - startY;
            const pathLen = Math.max(
              1,
              Math.sqrt(pathDx * pathDx + pathDy * pathDy),
            );
            // Project player base onto path
            const toPx = myPlayer.posX - startX;
            const toPy = myPlayer.posY - startY;
            const t = (toPx * pathDx + toPy * pathDy) / (pathLen * pathLen);
            if (t >= 0 && t <= 1) {
              const projX = startX + t * pathDx;
              const projY = startY + t * pathDy;
              const dist = Math.sqrt(
                (myPlayer.posX - projX) ** 2 + (myPlayer.posY - projY) ** 2,
              );
              if (dist < TORNADO_PATH_WIDTH / 2) {
                // Check if player has shield or tornado shelter
                const playerHasShield = myPlayer.shieldActive;
                if (playerHasShield) {
                  toast(
                    `🛡 Shield protected ${myPlayer.username} from the tornado!`,
                    {
                      duration: 5000,
                      style: {
                        background: "rgba(0,30,80,0.95)",
                        border: "2px solid #00aaff",
                        color: "#88ccff",
                      },
                    },
                  );
                } else if (hasTornadoShelter) {
                  toast(
                    "🏠 Tornado Shelter protected your base from the tornado!",
                    {
                      duration: 5000,
                      style: {
                        background: "rgba(0,50,20,0.95)",
                        border: "2px solid #38A169",
                        color: "#68D391",
                      },
                    },
                  );
                } else {
                  toast.error(
                    `🌪 Tornado devastated ${myPlayer.username}'s base! Troops hospitalized!`,
                    {
                      duration: 6000,
                    },
                  );
                }
              }
            }
          }

          // Destroy trees and ponds in tornado path (triggered once at start of movement)
          if (progress >= 0.05 && progress <= 0.15) {
            const pathDxT = endX - startX;
            const pathDyT = endY - startY;
            const pathLenT = Math.max(
              1,
              Math.sqrt(pathDxT * pathDxT + pathDyT * pathDyT),
            );
            const hitTrees: number[] = [];
            for (let i = 0; i < TREES.length; i++) {
              const tree = TREES[i];
              const toTx = tree.x - startX;
              const toTy = tree.y - startY;
              const tT =
                (toTx * pathDxT + toTy * pathDyT) / (pathLenT * pathLenT);
              if (tT >= 0 && tT <= 1) {
                const projTx = startX + tT * pathDxT;
                const projTy = startY + tT * pathDyT;
                const dT = Math.sqrt(
                  (tree.x - projTx) ** 2 + (tree.y - projTy) ** 2,
                );
                if (dT < TORNADO_PATH_WIDTH / 2) hitTrees.push(i);
              }
            }
            const hitPonds: number[] = [];
            for (let j = 0; j < PONDS.length; j++) {
              const pond = PONDS[j];
              const toPx2 = pond.x - startX;
              const toPy2 = pond.y - startY;
              const tP =
                (toPx2 * pathDxT + toPy2 * pathDyT) / (pathLenT * pathLenT);
              if (tP >= 0 && tP <= 1) {
                const projPx = startX + tP * pathDxT;
                const projPy = startY + tP * pathDyT;
                const dP = Math.sqrt(
                  (pond.x - projPx) ** 2 + (pond.y - projPy) ** 2,
                );
                if (dP < TORNADO_PATH_WIDTH / 2 + pond.rx) hitPonds.push(j);
              }
            }
            if (hitTrees.length > 0 || hitPonds.length > 0) {
              setDestroyedTreeIndices(hitTrees);
              setDestroyedPondIndices(hitPonds);
              toast(
                "🌪 Tornado ripped through the terrain — trees and ponds destroyed!",
                {
                  duration: 5000,
                  style: {
                    background: "rgba(60,30,0,0.95)",
                    border: "2px solid #ff8800",
                    color: "#ffcc44",
                  },
                },
              );
              // Clear after 3 minutes
              setTimeout(() => {
                setDestroyedTreeIndices([]);
                setDestroyedPondIndices([]);
              }, 180000);
            }
          }

          if (progress >= 1) {
            clearInterval(tickInterval);
            setTimeout(() => {
              setTornadoRender(null);
              tornadoActiveRef.current = false;
              nextTornadoRef.current = Date.now() + 20 * 60 * 1000;
            }, 1000);
          }
        }, 100);
      }, 5000);
    }, 5000); // check every 5s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPlayer, hasTornadoShelter]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleCameraChange = useCallback((x: number, y: number) => {
    cameraXRef.current = x;
    cameraYRef.current = y;
  }, []);

  // Auto-enter fullscreen on game load
  React.useEffect(() => {
    const tryFullscreen = () => {
      document.documentElement.requestFullscreen().catch(() => {});
      document.removeEventListener("click", tryFullscreen);
    };
    document.documentElement.requestFullscreen().catch(() => {
      document.addEventListener("click", tryFullscreen, { once: true });
    });
    return () => document.removeEventListener("click", tryFullscreen);
  }, []);

  // ── Game Update Notification ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!localStorage.getItem("ssmmo_update_v46")) {
      localStorage.setItem("ssmmo_update_v46", "1");
      setTimeout(() => {
        toast(
          "🆕 Game Update v47: Tap Warp → Clan HQ, visible attack marches, territory conquest, garrison troops on tiles, HQ Armor/Attack upgrades now apply in combat!",
          {
            duration: 10000,
            style: {
              background: "rgba(10,30,10,0.97)",
              border: "2px solid #44ff88",
              color: "#aaffcc",
              fontWeight: "bold",
              maxWidth: 380,
            },
          },
        );
      }, 3000);
    }
  }, []);

  const navigateTo = useCallback((x: number, y: number) => {
    setExternalCamera({ x, y });
    requestAnimationFrame(() => setExternalCamera(null));
  }, []);

  const findMyBase = useCallback(() => {
    if (myPlayer) navigateTo(myPlayer.posX, myPlayer.posY);
  }, [myPlayer, navigateTo]);

  // findMyHQ defined after myClan is available (below)

  // handleMapClick: detect territory tile taps + empty tile claim popup
  const handleMapClick = useCallback(
    (worldX: number, worldY: number) => {
      const CELL_SIZE_LOCAL = 20;
      const cellX = Math.floor(worldX / CELL_SIZE_LOCAL);
      const cellY = Math.floor(worldY / CELL_SIZE_LOCAL);
      const myClan2 = clans.find((c) => c.memberUsernames.includes(username));

      // Find if there's a territory tile here
      const tileHere = localTerritory.find(
        (t) => t.cellX === cellX && t.cellY === cellY,
      );

      if (tileHere) {
        if (!myClan2) return;
        if (tileHere.clanId === myClan2.id) {
          // Own tile: show garrison panel
          setClaimPopup(null);
          setTappedTerritoryCell({ cellX, cellY, clanId: tileHere.clanId });
        } else if (attackMode) {
          // Enemy tile in attack mode: show attack dialog
          setClaimPopup(null);
          setTappedTerritoryCell({ cellX, cellY, clanId: tileHere.clanId });
        }
        return;
      }

      // Empty unclaimed tile — show claim popup
      // Check no base/resource field on this tile
      const tileWorldX = cellX * CELL_SIZE_LOCAL + CELL_SIZE_LOCAL / 2;
      const tileWorldY = cellY * CELL_SIZE_LOCAL + CELL_SIZE_LOCAL / 2;
      const hasBase = players.some(
        (p) =>
          Math.abs(p.posX - tileWorldX) < CELL_SIZE_LOCAL * 2 &&
          Math.abs(p.posY - tileWorldY) < CELL_SIZE_LOCAL * 2,
      );
      const hasResource = resources.some(
        (r) =>
          Math.abs(r.x - tileWorldX) < CELL_SIZE_LOCAL * 3 &&
          Math.abs(r.y - tileWorldY) < CELL_SIZE_LOCAL * 3,
      );
      if (hasBase || hasResource) return;

      // Show claim popup (only if in a clan or no clan to show join message)
      // Close any existing popup first, then set new one
      setClaimPopup({
        worldX,
        worldY,
        cellX,
        cellY,
        screenX: 0, // will be set by canvas world-to-screen conversion via worldX/worldY
        screenY: 0,
      });
    },
    [clans, username, localTerritory, attackMode, players, resources],
  );

  // Feature 1: Tap Warp → Clan HQ
  const handleTapWarpToHQ = useCallback(() => {
    // Feature 3: Cannot teleport while troops are marching
    const myActiveMarches = marchingArmies.filter(
      (m) => m.attackerUsername === username && m.targetType !== "return",
    );
    if (myActiveMarches.length > 0) {
      toast.error("Cannot teleport while troops are marching!");
      return;
    }
    const myClanForWarp = clans.find((c) =>
      c.memberUsernames.includes(username),
    );
    if (!myClanForWarp?.hqPos) {
      toast.error("No Clan HQ found!");
      return;
    }
    const charge = teleports.find((t) => t.cooldownUntil < Date.now());
    if (!charge) {
      toast.error(
        "No teleport charges available! Use the Warp panel to recharge.",
      );
      return;
    }
    const hqX = myClanForWarp.hqPos.x;
    const hqY = myClanForWarp.hqPos.y;
    const success = onUseTeleport(charge.id, hqX, hqY);
    if (success) {
      navigateTo(hqX, hqY);
      const flashId = `tp_${Date.now()}`;
      setTeleportFlashes((prev) => [
        ...prev,
        { id: flashId, x: hqX, y: hqY, username, at: Date.now() },
      ]);
      setTimeout(
        () =>
          setTeleportFlashes((prev) => prev.filter((f) => f.id !== flashId)),
        2000,
      );
      toast.success("⚡ Warped to Clan HQ!");
    } else {
      toast.error("Teleport failed!");
    }
  }, [clans, username, teleports, onUseTeleport, navigateTo, marchingArmies]);

  // Detect other players teleporting
  React.useEffect(() => {
    const prev = prevPlayerPositionsRef.current;
    for (const p of players) {
      const old = prev.get(p.username);
      if (
        old &&
        (Math.abs(old.x - p.posX) > 500 || Math.abs(old.y - p.posY) > 500)
      ) {
        const flashId = `tp_${p.username}_${Date.now()}`;
        setTeleportFlashes((f) => [
          ...f,
          {
            id: flashId,
            x: p.posX,
            y: p.posY,
            username: p.username,
            at: Date.now(),
          },
        ]);
        setTimeout(
          () => setTeleportFlashes((f) => f.filter((ff) => ff.id !== flashId)),
          2500,
        );
        toast(`â¡ ${p.username} teleported!`, {
          duration: 2500,
          style: {
            background: "#0a0830",
            border: "2px solid #6688ff",
            color: "#aaccff",
          },
        });
      }
      prev.set(p.username, { x: p.posX, y: p.posY });
    }
  }, [players]);

  // Night thug spawn
  React.useEffect(() => {
    if (phase === "day" && prevPhaseRef.current === "night") {
      thugsSpawnedThisNightRef.current = false;
      setNightThugs((prev) =>
        prev.active ? { ...prev, active: false, despawning: true } : prev,
      );
    }
    prevPhaseRef.current = phase;
    if (phase !== "night" || thugsSpawnedThisNightRef.current) return;
    const all: GamePlayer[] = [...players];
    if (myPlayer) all.push(myPlayer);
    const targets = all.filter((p) => !p.shieldActive);
    if (targets.length === 0) return;
    const tgt = targets[Math.floor(Math.random() * targets.length)];
    thugsSpawnedThisNightRef.current = true;
    const edge = Math.floor(Math.random() * 4);
    const sx = edge === 0 ? 0 : edge === 1 ? 100000 : Math.random() * 100000;
    const sy = edge === 2 ? 0 : edge === 3 ? 100000 : Math.random() * 100000;
    setNightThugs({
      active: true,
      targetPlayerId: tgt.id,
      targetUsername: tgt.username,
      posX: sx,
      posY: sy,
      raidProgress: 0,
      despawning: false,
      spawnedAt: Date.now(),
      reachedAt: null,
    });
    toast(`🌙 A thug gang is attacking ${tgt.username}'s base!`, {
      duration: 8000,
      style: {
        background: "#1a0000",
        border: "2px solid #cc2200",
        color: "#ff8888",
        fontWeight: "bold",
      },
    });
    if (tgt.username === username)
      toast.error("⚠️ A thug gang is raiding your base! Raise your shield!", {
        duration: 15000,
        style: {
          background: "#2a0000",
          border: "2px solid #ff4400",
          color: "#ffaa88",
          fontWeight: "bold",
        },
      });
  }, [phase, players, myPlayer, username]);

  // Thug march animation
  React.useEffect(() => {
    if (!nightThugs.active || nightThugs.despawning) return;
    const id = setInterval(() => {
      setNightThugs((prev) => {
        if (!prev.active || prev.despawning) return prev;
        const all: GamePlayer[] = [...players];
        if (myPlayer) all.push(myPlayer);
        const tgt = all.find((p) => p.id === prev.targetPlayerId);
        if (!tgt || tgt.shieldActive) {
          toast("🛡️ The thug gang retreated!", {
            duration: 4000,
            style: {
              background: "#002200",
              border: "2px solid #44ff44",
              color: "#88ff88",
            },
          });
          return { ...prev, active: false, despawning: true };
        }
        const dx = tgt.posX - prev.posX;
        const dy = tgt.posY - prev.posY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
          const reachedAt = prev.reachedAt ?? Date.now();
          const raidProgress = Math.min(1, (Date.now() - reachedAt) / 30000);
          if (raidProgress >= 1)
            return {
              ...prev,
              active: false,
              despawning: true,
              raidProgress: 1,
            };
          return {
            ...prev,
            posX: tgt.posX,
            posY: tgt.posY,
            reachedAt,
            raidProgress,
          };
        }
        const spd = Math.min(dist, 500);
        return {
          ...prev,
          posX: prev.posX + (dx / dist) * spd,
          posY: prev.posY + (dy / dist) * spd,
        };
      });
    }, 100);
    return () => clearInterval(id);
  }, [nightThugs.active, nightThugs.despawning, players, myPlayer]);

  // Apply thug raid damage when raid completes
  const thugRaidCompletedRef = React.useRef(false);
  React.useEffect(() => {
    const THUG_DAMAGE = 3000; // soldiers lost per thug raid
    if (
      nightThugs.raidProgress >= 1 &&
      nightThugs.despawning &&
      nightThugs.targetUsername === username &&
      !thugRaidCompletedRef.current
    ) {
      thugRaidCompletedRef.current = true;
      onThugRaidComplete?.(THUG_DAMAGE);
      toast.error(
        `ð˜ Thug raid ended — you lost ${THUG_DAMAGE.toLocaleString()} soldiers!`,
        { duration: 6000 },
      );
    }
    if (!nightThugs.despawning) thugRaidCompletedRef.current = false;
  }, [
    nightThugs.raidProgress,
    nightThugs.despawning,
    nightThugs.targetUsername,
    username,
    onThugRaidComplete,
  ]);
  // Hacker: auto-block if target has a hacker, and complete hack after 3 minutes
  React.useEffect(() => {
    if (!hackerIsHacking || !hackerTargetId || !hackerStartTime) return;
    const id = setInterval(() => {
      const now = Date.now();
      // Check if target now owns a hacker (auto-block)
      const all: GamePlayer[] = [...players];
      if (myPlayer) all.push(myPlayer);
      const target = all.find((p) => p.id === hackerTargetId);
      if (target?.hackerOwned) {
        setHackerIsHacking(false);
        setHackerTargetId(null);
        setHackerStartTime(null);
        toast.error("🛡 Hack blocked by enemy hacker!", { duration: 5000 });
        return;
      }
      // Check if 3 minutes have elapsed
      if (now - hackerStartTime >= 3 * 60 * 1000) {
        setHackerIsHacking(false);
        const targetName = target?.username || "Unknown";
        setHackerTargetId(null);
        setHackerStartTime(null);
        // Apply hack to target (local simulation: set on myPlayer's knowledge)
        if (target?.username === username) {
          setMyShieldHackedUntil(now + 60000);
        }
        toast.success(
          `💻 ${username} hacked ${targetName}'s shield! It's down for 1 minute!`,
          {
            duration: 8000,
            style: {
              background: "#001a22",
              border: "2px solid #00ccff",
              color: "#00eeff",
              fontWeight: "bold",
            },
          },
        );
        // If the target is ourselves (for testing), apply directly
        if (target?.id === myPlayer?.id) {
          setMyShieldHackedUntil(now + 60000);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [
    hackerIsHacking,
    hackerTargetId,
    hackerStartTime,
    players,
    myPlayer,
    username,
  ]);

  // Hacker: restore shield when hackedUntil expires
  React.useEffect(() => {
    if (!myShieldHackedUntil) return;
    const remaining = myShieldHackedUntil - Date.now();
    if (remaining <= 0) {
      setMyShieldHackedUntil(null);
      return;
    }
    const t = setTimeout(() => {
      setMyShieldHackedUntil(null);
      toast("🔒 Your shield has been restored!", { duration: 4000 });
    }, remaining);
    return () => clearTimeout(t);
  }, [myShieldHackedUntil]);

  const handleUseTeleport = useCallback(
    (chargeId: number, x: number, y: number): boolean => {
      // Feature 3: Cannot teleport while troops are marching
      const myActiveMarches = marchingArmies.filter(
        (m) => m.attackerUsername === username && m.targetType !== "return",
      );
      if (myActiveMarches.length > 0) {
        toast.error("Cannot teleport while troops are marching!");
        return false;
      }
      const result = onUseTeleport(chargeId, x, y);
      if (result) {
        const flashId = `tp_${Date.now()}`;
        setTeleportFlashes((prev) => [
          ...prev,
          { id: flashId, x, y, username, at: Date.now() },
        ]);
        setTimeout(
          () =>
            setTeleportFlashes((prev) => prev.filter((f) => f.id !== flashId)),
          2000,
        );
        toast.success("â¡ You warped to a new location!", { duration: 2000 });
      }
      return result;
    },
    [onUseTeleport, username, marchingArmies],
  );

  const handleAdminSubmit = () => {
    if (adminPassword.toLowerCase() === "host") {
      setShowAdminPrompt(false);
      setShowAdmin(true);
      setAdminPassword("");
      setAdminError("");
    } else {
      setAdminError("Wrong password");
    }
  };

  // Crop modal state
  const [cropState, setCropState] = React.useState<{
    imageUrl: string;
    scale: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const cropDragRef = React.useRef<{
    startX: number;
    startY: number;
    startOX: number;
    startOY: number;
  } | null>(null);
  const CROP_SIZE = 280;

  // Handle base photo upload
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCropState({ imageUrl: dataUrl, scale: 1, offsetX: 0, offsetY: 0 });
      setShowPhotoUpload(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropApply = () => {
    if (!cropState) return;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = 200;
    offCanvas.height = 200;
    const ctx = offCanvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const baseScale =
        CROP_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
      const displayScale = baseScale * cropState.scale;
      const imgDrawX =
        (CROP_SIZE - img.naturalWidth * displayScale) / 2 + cropState.offsetX;
      const imgDrawY =
        (CROP_SIZE - img.naturalHeight * displayScale) / 2 + cropState.offsetY;
      ctx.drawImage(
        img,
        -imgDrawX / displayScale,
        -imgDrawY / displayScale,
        CROP_SIZE / displayScale,
        CROP_SIZE / displayScale,
        0,
        0,
        200,
        200,
      );
      const dataUrl = offCanvas.toDataURL("image/jpeg", 0.85);
      localStorage.setItem(`ssmmo_basephoto_${username}`, dataUrl);
      onUpdateBasePhoto?.(dataUrl);
      toast.success("🖼️ Base photo updated!");
      setCropState(null);
    };
    img.src = cropState.imageUrl;
  };

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    cropDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOX: cropState?.offsetX ?? 0,
      startOY: cropState?.offsetY ?? 0,
    };
  };
  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropDragRef.current || !cropState) return;
    setCropState((prev) =>
      prev
        ? {
            ...prev,
            offsetX:
              cropDragRef.current!.startOX +
              e.clientX -
              cropDragRef.current!.startX,
            offsetY:
              cropDragRef.current!.startOY +
              e.clientY -
              cropDragRef.current!.startY,
          }
        : prev,
    );
  };
  const handleCropPointerUp = () => {
    cropDragRef.current = null;
  };

  const handlePhotoRemove = () => {
    localStorage.removeItem(`ssmmo_basephoto_${username}`);
    onUpdateBasePhoto?.(null);
    toast.success(
      "\uD83D\uDDD1\uFE0F Base photo removed \u2014 default fortress restored!",
    );
    setShowPhotoUpload(false);
  };

  // Handle shop purchase
  const handleShopBuy = (itemId: string, cost: number): boolean => {
    if (!myPlayer || (myPlayer.gold || 0) < cost) return false;
    // Deduct gold (handled in GameScreen local state + notify)
    if (myPlayer) {
      const newGold = Math.max(0, (myPlayer.gold || 0) - cost);
      localStorage.setItem(`ssmmo_gold_${serverId}`, String(newGold));
      toast.success(`\uD83D\uDCB0 Purchased! Remaining gold: ${newGold}`);
      // Apply item effect
      switch (itemId) {
        case "troop_pack_large":
          toast.success("\uD83D\uDDE1\uFE0F 500 soldiers added!");
          break;
        case "tank_pack":
          toast.success("\uD83D\uDEE1\uFE0F 100 tanks added!");
          break;
        case "jet_pack":
          toast.success("\u2708\uFE0F 50 jets added!");
          break;
        case "resource_crate":
          toast.success("\uD83D\uDCE6 Resources added!");
          break;
        case "buy_dragon":
          setHasClanDragon(true);
          localStorage.setItem(`ssmmo_clanDragon_${username}`, "1");
          toast.success(
            "\uD83D\uDC09 Dragon acquired! It now guards your clan HQ!",
          );
          break;
        case "emergency_shield":
          toast.success("\uD83D\uDEE1\uFE0F Emergency shield activated!");
          break;
        case "special_forces":
          setHasSpecialForces(true);
          localStorage.setItem(`ssmmo_specialforces_${serverId}`, "1");
          toast.success("âï¸ Special Forces Squad deployed near your clan HQ!");
          break;
        case "buy_hacker":
          setHasHacker(true);
          localStorage.setItem(`ssmmo_hacker_${serverId}`, "1");
          toast.success(
            "💻 Hacker acquired! Deploy cyber attacks on enemy shields!",
          );
          break;
        case "spy_plane": {
          const newSpyCount = (myPlayer.spyPlanes ?? 0) + 2;
          setSpyPlaneCount(newSpyCount);
          onAddSpyPlanes?.(2);
          toast.success(
            "🛩 Spy Plane Pack acquired! 2 planes added to inventory.",
          );
          break;
        }
        case "anti_air_gun": {
          const currentAA = antiAirCount;
          if (currentAA >= 3) {
            toast.error("❌ Max 3 Anti-Air Guns per player!");
            return false;
          }
          const newAACount = currentAA + 1;
          setAntiAirCount(newAACount);
          localStorage.setItem(`ssmmo_antiair_${serverId}`, String(newAACount));
          toast.success(
            `🔫 Anti-Air Gun installed! (${newAACount}/3) — Intercepts enemy spy planes!`,
          );
          break;
        }
        case "start_clan":
          toast.success(
            "ð° Gold spent! Now create your clan in the Clan panel.",
          );
          break;
        default:
          break;
      }
    }
    return true;
  };

  const handleSave = () => {
    onSaveGame();
    setSaveMsg("Game saved!");
    setTimeout(() => setSaveMsg(""), 2000);
    setShowMenu(false);
  };

  const handleLoad = () => {
    const ok = onLoadGame();
    setSaveMsg(ok ? "Game loaded!" : "No save found");
    setTimeout(() => setSaveMsg(""), 2000);
    setShowMenu(false);
  };

  const handleShareLink = () => {
    const link = getShareLink();
    navigator.clipboard
      .writeText(link)
      .then(() => {
        toast.success("Share link copied! Send it to friends.");
        setShowMenu(false);
      })
      .catch(() => {
        toast.error(`Failed to copy \u2014 share: ${link}`);
      });
  };

  const handleAttackBase = useCallback((player: GamePlayer) => {
    setAttackTarget(player);
  }, []);

  // ── Scout Mission launcher
  const launchScoutMission = React.useCallback(
    (target: GamePlayer) => {
      if (spyPlaneCount <= 0) {
        toast.error("No spy planes available! Buy them in the Shop.");
        return;
      }
      if (target.shieldActive) {
        toast.error("🛡 Target base is shielded — cannot scout.");
        return;
      }

      setSpyPlaneCount((prev) => Math.max(0, prev - 1));

      const missionId = `scout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const mission: ScoutMission = {
        id: missionId,
        targetId: target.id,
        targetUsername: target.username,
        targetX: target.posX,
        targetY: target.posY,
        phase: "outbound",
        startedAt: Date.now(),
      };

      setScoutMissions((prev) => [...prev, mission]);

      // Check anti-air intercept
      const aaCount = target.antiAirCount ?? 0;
      let interceptChance = 0;
      if (aaCount === 1) interceptChance = 0.55;
      else if (aaCount === 2) interceptChance = 0.8;
      else if (aaCount >= 3) interceptChance = 0.9;

      const intercepted = aaCount > 0 && Math.random() < interceptChance;

      if (intercepted) {
        // Immediate intercept notification
        toast.error(`🔫 Spy plane shot down over ${target.username}'s base!`);
        // If target is local player, notify them too
        if (target.username === username) {
          toast.info("✅ Anti-Air intercepted an enemy spy plane!");
        }
        setScoutMissions((prev) =>
          prev.map((m) =>
            m.id === missionId
              ? { ...m, phase: "intercepted", intercepted: true }
              : m,
          ),
        );
        // Clean up intercepted mission after 5s
        setTimeout(() => {
          setScoutMissions((prev) => prev.filter((m) => m.id !== missionId));
        }, 5000);
      } else {
        // 8 second flight time
        setTimeout(() => {
          // Collect intel
          const intel = {
            troops: target.troops?.soldiers ?? 0,
            tanks: target.troops?.tanks ?? 0,
            jets: target.troops?.jets ?? 0,
            wallHp: target.wallHp ?? target.maxHp ?? 0,
            maxWallHp: target.maxWallHp ?? target.maxHp ?? 10000,
            timestamp: Date.now(),
          };

          const completedMission: ScoutMission = {
            ...mission,
            phase: "complete",
            returnedAt: Date.now(),
            intel,
          };

          setScoutMissions((prev) =>
            prev.map((m) => (m.id === missionId ? completedMission : m)),
          );
          setIntelReport(completedMission);
          toast.success(
            `🛩 Spy plane returned with intel on ${target.username}!`,
          );

          // Notify target if it's the current player
          if (target.username === username) {
            const myClanForNotify = clans.find((c) =>
              c.memberUsernames.includes(username),
            );
            toast.info(
              `⚠️ Your base was scouted by ${myClanForNotify?.name || "an enemy"}!`,
            );
          }

          // Clean up complete mission after 10s
          setTimeout(() => {
            setScoutMissions((prev) => prev.filter((m) => m.id !== missionId));
          }, 10000);
        }, 8000);
      }
    },
    [spyPlaneCount, username, clans],
  );

  const handleAttackResource = useCallback((field: ResourceField) => {
    setAttackTarget(field);
  }, []);

  const handleAttackBossClick = useCallback(() => {
    setAttackTarget("boss");
  }, []);

  const handleAttackNPCBaseClick = useCallback((base: NPCBase) => {
    setAttackTarget(base);
  }, []);

  const myClan = clans.find((c) => c.memberUsernames.includes(username));
  const disconnectedTiles = React.useMemo(
    () =>
      getDisconnectedTiles(
        localTerritory.length > 0 ? localTerritory : territory,
        myClan,
        20,
      ),
    [localTerritory, territory, myClan],
  );

  const findMyHQ = useCallback(() => {
    const hq = clans.find((c) => c.memberUsernames.includes(username))?.hqPos;
    if (hq) {
      navigateTo(hq.x, hq.y);
    } else {
      toast.info("No HQ built yet");
    }
  }, [clans, username, navigateTo]);

  const isAtWarWith = useCallback(
    (targetClanId: string | undefined): boolean => {
      if (!myClan || !targetClanId) return false;
      return (
        (myClan.declaredWars || []).includes(targetClanId) ||
        clans.some(
          (c) =>
            c.id === targetClanId && (c.declaredWars || []).includes(myClan.id),
        )
      );
    },
    [myClan, clans],
  );

  // Helper: push a march to globalMarches in localStorage
  const addGlobalMarch = React.useCallback((march: MarchingArmy) => {
    try {
      const raw = localStorage.getItem("ssmmo_globalMarches");
      const existing: MarchingArmy[] = raw ? JSON.parse(raw) : [];
      const updated = [...existing, march];
      localStorage.setItem("ssmmo_globalMarches", JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  const removeGlobalMarch = React.useCallback((marchId: string) => {
    try {
      const raw = localStorage.getItem("ssmmo_globalMarches");
      if (!raw) return;
      const existing: MarchingArmy[] = JSON.parse(raw);
      const updated = existing.filter((m) => m.id !== marchId);
      localStorage.setItem("ssmmo_globalMarches", JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  const confirmAttack = useCallback(() => {
    if (!attackTarget || !myPlayer) return;
    const MARCH_DURATION = 3 * 60 * 1000; // 3 minutes

    // Feature 4: Max marches per player (50 for SableSoulreaver, 5 for others)
    const marchCap = username === "SableSoulreaver" ? 50 : 5;
    const myActiveCount = marchingArmies.filter(
      (m) => m.attackerUsername === username && m.targetType !== "return",
    ).length;
    if (myActiveCount >= marchCap) {
      toast.error(
        `Maximum ${marchCap} unit groups already deployed! Wait for troops to return.`,
      );
      return;
    }

    // Shield check for player targets
    if (
      attackTarget !== "boss" &&
      !isNPCBase(attackTarget) &&
      "posX" in attackTarget
    ) {
      const target = attackTarget as GamePlayer;
      if (target.shieldActive) {
        const targetClan = clans.find((c) =>
          c.memberUsernames.includes(target.username),
        );
        if (!isAtWarWith(targetClan?.id)) {
          toast.error(
            "\uD83D\uDEE1\uFE0F Cannot attack \u2014 enemy has an active shield! Declare war to bypass shields.",
          );
          setAttackTarget(null);
          return;
        }
      }
    }

    let toX = myPlayer.posX;
    let toY = myPlayer.posY;
    let targetLabel = "";
    let targetType: MarchingArmy["targetType"] = "base";
    let targetFieldId: string | null = null;

    if (attackTarget === "boss") {
      toX = WORLD_SIZE_HALF;
      toY = WORLD_SIZE_HALF;
      targetLabel = "BOSS";
      targetType = "boss";
    } else if (isNPCBase(attackTarget)) {
      toX = attackTarget.posX;
      toY = attackTarget.posY;
      targetLabel = attackTarget.memberName;
      targetType = "base";
    } else if ("posX" in attackTarget) {
      toX = (attackTarget as GamePlayer).posX;
      toY = (attackTarget as GamePlayer).posY;
      targetLabel = (attackTarget as GamePlayer).username;
      targetType = "base";
    } else {
      toX = (attackTarget as ResourceField).x;
      toY = (attackTarget as ResourceField).y;
      targetLabel = (attackTarget as ResourceField).type;
      targetType = "resource";
      targetFieldId = (attackTarget as ResourceField).id;
    }

    // Feature 7: Determine unit type for march visual
    const myTroops2 = myPlayer.troops || { soldiers: 0, tanks: 0, jets: 0 };
    let marchUnitType: MarchingArmy["unitType"] = "mixed";
    if (
      myTroops2.jets > myTroops2.soldiers &&
      myTroops2.jets > myTroops2.tanks
    ) {
      marchUnitType = "jets";
    } else if (myTroops2.tanks > myTroops2.soldiers) {
      marchUnitType = "tanks";
    } else if (myTroops2.soldiers > 0) {
      marchUnitType = "soldiers";
    }

    const marchId = `march_${Date.now()}_${Math.random()}`;
    const march: MarchingArmy = {
      id: marchId,
      fromX: myPlayer.posX,
      fromY: myPlayer.posY,
      toX,
      toY,
      startTime: Date.now(),
      duration: MARCH_DURATION,
      attackerUsername: username,
      attackerColor: myClan?.color || "#ff4444",
      targetType,
      targetLabel,
      unitType: marchUnitType,
      isReturn: false,
      marchType: "attack",
    };

    setMarchingArmies((prev) => [...prev, march]);
    addGlobalMarch(march);

    // Play march start sound
    if (
      attackTarget !== "boss" &&
      !isNPCBase(attackTarget) &&
      "posX" in attackTarget &&
      ((attackTarget as GamePlayer).troops?.jets || 0) > 1000
    ) {
      playJetSound();
    } else {
      playClash();
    }

    // After 2 minutes, apply the attack
    const timer = setTimeout(() => {
      let captureResult: CaptureResult | null = null;
      let attackedPlayer: GamePlayer | null = null;

      if (attackTarget === "boss") {
        const dmg = 20 * Math.max(1, upgrades.attackPower);
        onAttackBoss(dmg);
        playExplosion();
      } else if (isNPCBase(attackTarget)) {
        onAttackNPCBase?.(attackTarget);
        playClash();
        toast("💀 The Unspeaken Ones retaliate!", { duration: 2500 });
        // Add attack log for NPC base attack
        {
          const npcTarget2 = attackTarget as NPCBase;
          setAttackLog((prev) => {
            const entry: AttackLogEntry = {
              id: `log_${Date.now()}_${Math.random()}`,
              attackerName: username,
              targetName: npcTarget2.memberName,
              targetX: npcTarget2.posX,
              targetY: npcTarget2.posY,
              timestamp: Date.now(),
            };
            return [...prev.slice(-49), entry];
          });
          // Relocate NPC base after defeat
          if (npcTarget2.hp <= 1000) {
            const newNpcX = 5000 + Math.random() * 90000;
            const newNpcY = 5000 + Math.random() * 90000;
            toast(
              `👻 ${npcTarget2.memberName} destroyed! Respawning elsewhere...`,
              { duration: 4000 },
            );
            onRelocateNPCBase?.(npcTarget2.id, newNpcX, newNpcY);
          }
        }
      } else if ("posX" in attackTarget) {
        const result = onAttackBase(attackTarget as GamePlayer);
        if (result === "shielded") {
          toast.error(
            "\uD83D\uDEE1\uFE0F Attack blocked \u2014 target has an active shield!",
          );
        } else {
          attackedPlayer = attackTarget as GamePlayer;
          playClash();
          const defender = attackTarget as GamePlayer;
          // Add attack log entry
          setAttackLog((prev) => {
            const entry: AttackLogEntry = {
              id: `log_${Date.now()}_${Math.random()}`,
              attackerName: username,
              targetName: defender.username,
              targetX: defender.posX,
              targetY: defender.posY,
              timestamp: Date.now(),
            };
            return [...prev.slice(-49), entry];
          });
          // Feature 7: Apply clan upgrade bonuses
          const attackerClan = clans.find((c) =>
            c.memberUsernames.includes(username),
          );
          const defenderClan = clans.find((c) =>
            c.memberUsernames.includes(defender.username),
          );
          const atkLevel = attackerClan?.clanUpgrades?.attackBonus ?? 0;
          const defLevel = defenderClan?.clanUpgrades?.defenseBonus ?? 0;
          const effectiveAtkMultiplier = 1 + atkLevel * 0.05;
          const effectiveDefMultiplier = 1 - defLevel * 0.05;
          // Trigger battle window
          setActiveBattle({
            attackerName: username,
            defenderName: defender.username,
            battleId: marchId,
            attackerHp: Math.round(
              (myPlayer?.hp ?? 8000) * effectiveAtkMultiplier,
            ),
            attackerMaxHp: Math.round(
              (myPlayer?.maxHp ?? 8000) * effectiveAtkMultiplier,
            ),
            defenderHp: Math.round(
              defender.hp * Math.max(0.1, effectiveDefMultiplier),
            ),
            defenderMaxHp: Math.round(
              (defender.maxHp || 8000) * Math.max(0.1, effectiveDefMultiplier),
            ),
            attackerTroops:
              (myPlayer?.troops?.soldiers ?? 0) +
              (myPlayer?.troops?.tanks ?? 0) +
              (myPlayer?.troops?.jets ?? 0),
            defenderTroops:
              (defender.troops?.soldiers ?? 0) +
              (defender.troops?.tanks ?? 0) +
              (defender.troops?.jets ?? 0),
          });
          // Close battle window after 3 minutes
          setTimeout(() => setActiveBattle(null), MARCH_DURATION);
          // Defeat respawn: if defender HP is near 0, respawn them
          if (defender.hp <= 1000) {
            toast(
              `💀 ${defender.username}'s base was destroyed! Teleported to a new location.`,
              { duration: 5000 },
            );
            onRespawnDefeatedPlayer?.(defender.id);
          }
        }
      } else {
        const resField = attackTarget as ResourceField;
        captureResult = onAttackResource(resField.id);
        playClash();
        // Log resource attack
        setAttackLog((prev) => {
          const entry: AttackLogEntry = {
            id: `log_${Date.now()}_${Math.random()}`,
            attackerName: username,
            targetName: `${resField.type} field`,
            targetX: resField.x,
            targetY: resField.y,
            timestamp: Date.now(),
          };
          return [...prev.slice(-49), entry];
        });
      }

      // Remove outbound march
      setMarchingArmies((prev) => prev.filter((m) => m.id !== marchId));
      removeGlobalMarch(marchId);
      marchTimersRef.current.delete(marchId);

      // \u2500\u2500 Return march (2 min back)
      const returnId = `return_${Date.now()}_${Math.random()}`;
      const returnMarch: MarchingArmy = {
        id: returnId,
        fromX: toX,
        fromY: toY,
        toX: myPlayer.posX,
        toY: myPlayer.posY,
        startTime: Date.now(),
        duration: MARCH_DURATION,
        attackerUsername: username,
        attackerColor: myClan?.color || "#88cc44",
        targetType: "return",
        targetLabel: `${username} returning`,
        unitType: march.unitType ?? "mixed",
        isReturn: true,
        marchType: "return",
      };
      setMarchingArmies((prev) => [...prev, returnMarch]);
      addGlobalMarch(returnMarch);
      const returnTimer = setTimeout(() => {
        setMarchingArmies((prev) => prev.filter((m) => m.id !== returnId));
        removeGlobalMarch(returnId);
        marchTimersRef.current.delete(returnId);
        toast.success("\uD83D\uDEB6 Troops returned to base!");
        setActiveBattle(null);
      }, MARCH_DURATION);
      marchTimersRef.current.set(returnId, returnTimer);

      // Show garrison dialog if field was captured
      if (
        captureResult === "captured" ||
        captureResult === "troops_defeated" ||
        captureResult === "guards_defeated"
      ) {
        if (targetFieldId) {
          const field = resources.find((r) => r.id === targetFieldId);
          if (
            captureResult === "captured" ||
            captureResult === "troops_defeated"
          ) {
            setPendingGarrison({
              fieldId: targetFieldId,
              fieldType: field?.type || "",
            });
          } else {
            toast.success(
              "\u2620\uFE0F Guards defeated! Attack again to capture the field.",
            );
          }
        }
      } else if (captureResult === "guards_remaining") {
        const field = resources.find((r) => r.id === targetFieldId);
        toast(
          `\u26A0\uFE0F Guards weakened! ${field?.guardStrength || 0} guard strength remaining. Keep attacking!`,
        );
      } else if (captureResult === "occupied_by_enemy") {
        toast(
          "\u2694\uFE0F Enemy troops weakened! Keep attacking to displace them.",
        );
      }

      // Log attack
      if (attackedPlayer) {
        toast.success(
          `\u2694\uFE0F Attack landed on ${attackedPlayer.username}!`,
        );
      }
    }, MARCH_DURATION);

    marchTimersRef.current.set(marchId, timer);
    setAttackTarget(null);
    setAttackMode(false);
  }, [
    attackTarget,
    myPlayer,
    username,
    myClan,
    clans,
    isAtWarWith,
    onAttackBase,
    onAttackResource,
    onAttackBoss,
    onAttackNPCBase,
    upgrades,
    resources,
    onRelocateNPCBase,
    onRespawnDefeatedPlayer,
    marchingArmies,
    addGlobalMarch,
    removeGlobalMarch,
  ]);

  const cancelMarch = useCallback(
    (marchId: string) => {
      const timer = marchTimersRef.current.get(marchId);
      if (timer) {
        clearTimeout(timer);
        marchTimersRef.current.delete(marchId);
      }
      setMarchingArmies((prev) => prev.filter((m) => m.id !== marchId));
      removeGlobalMarch(marchId);
      toast("\u274C March cancelled \u2014 troops recalled.");
    },
    [removeGlobalMarch],
  );

  // Feature 5: Attack an enemy territory tile
  const attackTerritoryTile = useCallback(
    (cellX: number, cellY: number) => {
      const myClan2 = clans.find((c) => c.memberUsernames.includes(username));
      if (!myClan2) {
        toast.error("You must be in a clan to attack territory!");
        return;
      }
      // Feature 8: Tile must be adjacent to existing clan tile
      const myTiles = localTerritory.filter((t) => t.clanId === myClan2.id);
      const isAdjacent = myTiles.some(
        (t) =>
          (Math.abs(t.cellX - cellX) === 1 && t.cellY === cellY) ||
          (Math.abs(t.cellY - cellY) === 1 && t.cellX === cellX),
      );
      if (myTiles.length > 0 && !isAdjacent) {
        toast.error("⚔ Territory conquest requires an adjacent friendly tile!");
        return;
      }
      if (!myPlayer) return;
      // Feature 4: Max marches per player (50 for SableSoulreaver, 5 for others)
      const marchCap2 = username === "SableSoulreaver" ? 50 : 5;
      const myActiveCount = marchingArmies.filter(
        (m) => m.attackerUsername === username && m.targetType !== "return",
      ).length;
      if (myActiveCount >= marchCap2) {
        toast.error(
          `Maximum ${marchCap2} unit groups already deployed! Wait for troops to return.`,
        );
        return;
      }
      const MARCH_DURATION = 3 * 60 * 1000;
      const toX = cellX * 20 + 10; // CELL_SIZE = 20
      const toY = cellY * 20 + 10;
      const marchId = `terrainAtk_${Date.now()}_${Math.random()}`;
      const march: MarchingArmy = {
        id: marchId,
        fromX: myPlayer.posX,
        fromY: myPlayer.posY,
        toX,
        toY,
        startTime: Date.now(),
        duration: MARCH_DURATION,
        attackerUsername: username,
        attackerColor: myClan2?.color || "#ff4444",
        targetType: "base",
        targetLabel: `tile_${cellX}_${cellY}`,
      };
      setMarchingArmies((prev) => [...prev, march]);
      addGlobalMarch(march);
      toast(`⚔ Marching to conquer tile (${cellX}, ${cellY})...`);
      const timer = setTimeout(() => {
        setMarchingArmies((prev) => prev.filter((m) => m.id !== marchId));
        removeGlobalMarch(marchId);
        marchTimersRef.current.delete(marchId);
        // Resolve territory conquest
        const targetCell = localTerritory.find(
          (t) => t.cellX === cellX && t.cellY === cellY,
        );
        const garrisonStrength = targetCell?.occupyingTroops?.count ?? 500;
        const myTroops =
          (myPlayer?.troops?.soldiers ?? 0) +
          (myPlayer?.troops?.tanks ?? 0) * 2;
        const myClan3 = clans.find((c) => c.memberUsernames.includes(username));
        const atkLevel = myClan3?.clanUpgrades?.attackBonus ?? 0;
        const effectiveTroops = Math.round(myTroops * (1 + atkLevel * 0.05));
        if (effectiveTroops >= garrisonStrength) {
          // Attacker wins: update territory
          setLocalTerritory((prev) => {
            const updated = prev.map((t) =>
              t.cellX === cellX && t.cellY === cellY
                ? { ...t, clanId: myClan2.id, occupyingTroops: null }
                : t,
            );
            // Save to localStorage
            try {
              const savedTiles = JSON.parse(
                localStorage.getItem("ssmmo_territory") || "[]",
              );
              const newTiles = savedTiles.map((t: (typeof updated)[0]) =>
                t.cellX === cellX && t.cellY === cellY
                  ? { ...t, clanId: myClan2.id, occupyingTroops: null }
                  : t,
              );
              localStorage.setItem("ssmmo_territory", JSON.stringify(newTiles));
            } catch {
              // ignore
            }
            return updated;
          });
          toast.success(
            `🏴 Territory conquered! Tile (${cellX}, ${cellY}) now belongs to ${myClan2.name}!`,
          );
        } else {
          toast.error(
            "⚔ Attack failed! Enemy garrison was too strong. Lost troops in the assault.",
          );
        }
      }, MARCH_DURATION);
      marchTimersRef.current.set(marchId, timer);
    },
    [
      clans,
      username,
      myPlayer,
      marchingArmies,
      localTerritory,
      addGlobalMarch,
      removeGlobalMarch,
    ],
  );

  // Feature 6: Garrison troops on territory tile
  const garrisonOnTerritoryTile = useCallback(
    (cellX: number, cellY: number, count: number) => {
      if (!myPlayer) return;
      const soldiers = myPlayer.troops?.soldiers ?? 0;
      if (soldiers < count) {
        toast.error(`Not enough soldiers! You have ${soldiers}.`);
        return;
      }
      setLocalTerritory((prev) =>
        prev.map((t) =>
          t.cellX === cellX && t.cellY === cellY
            ? {
                ...t,
                occupyingTroops: {
                  username,
                  clanId:
                    clans.find((c) => c.memberUsernames.includes(username))
                      ?.id || "",
                  count,
                },
              }
            : t,
        ),
      );
      toast.success(
        `🪖 ${count} troops garrisoned on tile (${cellX}, ${cellY})!`,
      );
    },
    [username, myPlayer, clans],
  );

  // Feature 6: Return troops from territory tile
  const returnTroopsFromTile = useCallback((cellX: number, cellY: number) => {
    setLocalTerritory((prev) =>
      prev.map((t) =>
        t.cellX === cellX && t.cellY === cellY
          ? { ...t, occupyingTroops: null }
          : t,
      ),
    );
    toast.success(`🏃 Troops recalled from tile (${cellX}, ${cellY})!`);
  }, []);

  const triggerNuclearBlast = useCallback((x: number, y: number) => {
    const blastId = `nuke_${Date.now()}_${Math.random()}`;
    const blast: NuclearBlast = { id: blastId, x, y, startTime: Date.now() };
    setNuclearBlasts((prev) => [...prev, blast]);
    toast.error("\u2622\ufe0f NUCLEAR STRIKE LAUNCHED!", { duration: 3000 });
    setTimeout(() => {
      setNuclearBlasts((prev) => prev.filter((b) => b.id !== blastId));
    }, 3500);
  }, []);

  const handleKickAndNuke = useCallback(
    (kickUsername: string, x: number, y: number) => {
      triggerNuclearBlast(x, y);
      toast.error(`\u2622\ufe0f ${kickUsername} has been KICKED and NUKED!`, {
        duration: 4000,
      });
    },
    [triggerNuclearBlast],
  );

  const handleBanPlayer = useCallback((banUsername: string) => {
    toast.error(`🚫 ${banUsername} has been BANNED from the server!`, {
      duration: 5000,
    });
  }, []);

  const handleHealComplete = useCallback(
    (type: "soldiers" | "tanks" | "jets", count: number) => {
      setLocalTroops((prev) => ({ ...prev, [type]: prev[type] + count }));
      toast.success(`\u2705 ${count} ${type} healed and returned to base!`);
    },
    [],
  );

  const serverName =
    ["Shadowwood", "Ironveil", "Crimsonmoor"][serverId - 1] ||
    `Server ${serverId}`;
  const nextTrainingAt = lastTrainingAt + trainingInterval;

  const hqPanelClan = hqPanelClanId
    ? clans.find((c) => c.id === hqPanelClanId) || null
    : null;

  const hqRebuildCooldownMs =
    myClan?.hqDestroyedAt && myClan.hqDestroyedAt > 0
      ? Math.max(0, myClan.hqDestroyedAt + 60 * 60 * 1000 - Date.now())
      : 0;
  const canBuildHQ =
    myClan &&
    myClan.leaderUsername === username &&
    !myClan.hqPos &&
    hqRebuildCooldownMs === 0;

  const activeMarchingArmies = marchingArmies.filter(
    (m) => m.targetType !== "return",
  );

  // Other clans (not mine) for declare war
  const otherClans = clans.filter(
    (c) => c.serverId === serverId && !c.memberUsernames.includes(username),
  );

  // Compute set of player usernames that are being attacked right now
  const attackingTargets = React.useMemo(() => {
    const targets = new Set<string>();
    for (const march of marchingArmies) {
      if (march.targetType === "base") {
        targets.add(march.targetLabel);
      }
    }
    return targets;
  }, [marchingArmies]);

  // Is MY base being attacked?
  const myBaseUnderAttack = attackingTargets.has(username);

  // Gold amount for current player
  const myGold = myPlayer?.gold || 0;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ background: "#000" }}
    >
      <style>{`
        @keyframes teleportRing {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.2); }
          40% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
        }
      `}</style>
      {/* Teleport flash overlays */}
      {teleportFlashes.map((flash) => (
        <div
          key={flash.id}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 150 }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              width: 140,
              height: 140,
              borderRadius: "50%",
              border: "3px solid #6688ff",
              boxShadow: "0 0 30px #6688ff, 0 0 60px #3344ff",
              animation: "teleportRing 1.5s ease-out forwards",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 32 }}>â¡</span>
            <span
              style={{
                color: "#aaccff",
                fontSize: 12,
                fontWeight: "bold",
                textShadow: "0 0 8px #6688ff",
              }}
            >
              {flash.username}
            </span>
          </div>
        </div>
      ))}
      {/* Rain weather banner */}
      {isRaining && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 25,
            background: "rgba(10,20,60,0.82)",
            borderBottom: "2px solid rgba(60,100,220,0.6)",
            padding: "6px 16px",
            textAlign: "center",
            color: "#aaccff",
            fontWeight: "bold",
            fontSize: 13,
            letterSpacing: 1,
            pointerEvents: "none",
          }}
          data-ocid="weather.panel"
        >
          🌧 Rainy Day — Visibility reduced
        </div>
      )}

      {/* Day counter display */}
      <div
        style={{
          position: "absolute",
          top: 44,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "rgba(10,15,5,0.7)",
          border: "1px solid rgba(100,160,40,0.3)",
          borderRadius: 8,
          padding: "2px 10px",
          color: "#aaddaa",
          fontSize: 10,
          pointerEvents: "none",
        }}
      >
        📅 Day {inGameDay}
      </div>

      {/* Boss Event Banner */}
      {bossNPC &&
        !bossNPC.defeated &&
        bossNPC.shieldCooldownUntil > Date.now() &&
        (() => {
          const remaining = Math.max(
            0,
            Math.ceil((bossNPC.shieldCooldownUntil - Date.now()) / 1000),
          );
          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          const flash = Math.floor(Date.now() / 500) % 2 === 0;
          // tick reference to force refresh
          void tick;
          return (
            <div
              style={{
                position: "absolute",
                top: 60,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 120,
                background: "rgba(20,0,30,0.95)",
                border: `2px solid ${flash ? "#ff3366" : "#cc0044"}`,
                borderRadius: 12,
                padding: "6px 16px",
                color: "#ff88cc",
                fontWeight: "bold",
                fontSize: 13,
                textAlign: "center",
                pointerEvents: "none",
                boxShadow: "0 0 20px rgba(255,0,100,0.6)",
              }}
            >
              <div style={{ color: "#ff3366", fontSize: 11, letterSpacing: 1 }}>
                \u2694\uFE0F WORLD EVENT â BOSS BATTLE
              </div>
              <div>\uD83D\uDC51 BOSS SHIELD IS DOWN</div>
              <div style={{ fontSize: 11, color: "#ffaa88", marginTop: 2 }}>
                \uD83D\uDEE1 Recharges in: {mins}m {secs}s â Attack at (50000,
                50000)!
              </div>
            </div>
          );
        })()}
      <div className="absolute inset-0">
        <GameCanvas
          ref={gameCanvasRef}
          players={players}
          myPlayer={myPlayer}
          clans={clans}
          territory={localTerritory.length > 0 ? localTerritory : territory}
          resources={resources}
          phase={phase}
          attackMode={attackMode}
          onAttackBase={handleAttackBase}
          onAttackResource={handleAttackResource}
          onAttackBoss={handleAttackBossClick}
          onCameraChange={handleCameraChange}
          externalCamera={externalCamera}
          attackFlashes={attackFlashes}
          nuclearBlasts={nuclearBlasts}
          bossNPC={bossNPC}
          myShieldActive={myShieldActive}
          healingQueue={healingQueue}
          marchingArmies={[
            ...marchingArmies,
            ...globalMarches.filter(
              (gm) => !marchingArmies.find((m) => m.id === gm.id),
            ),
          ]}
          onHQTap={(clan) => {
            setHQPanelClanId(clan.id);
            setShowHQPanel(true);
          }}
          onAttackClanHQ={attackClanHQ}
          onPlayerTap={(player) => setTappedPlayer(player)}
          onOwnBaseTap={() => setShowPhotoUpload(true)}
          attackingTargets={attackingTargets}
          npcBases={npcBases}
          onAttackNPCBase={handleAttackNPCBaseClick}
          dragons={dragons}
          onAttackDragon={onAttackDragon}
          onDragonAutoAttack={onDragonAutoAttack}
          dragonModeActive={dragonModeActive}
          hasClanDragon={hasClanDragon}
          hasSpecialForces={hasSpecialForces}
          hasHacker={hasHacker}
          sfServerId={serverId}
          nightThugs={nightThugs}
          myShieldHackedUntil={myShieldHackedUntil}
          pondTrolls={pondTrolls}
          onTrollTap={(tid) => setSelectedTrollId(tid)}
          skyJets={skyJets}
          isRaining={isRaining}
          tornadoRender={tornadoRender ?? undefined}
          tornadoDestruction={{ destroyedTreeIndices, destroyedPondIndices }}
          hasTornadoShelter={hasTornadoShelter}
          onMapClick={handleMapClick}
          atomBombs={atomBombs}
          activeSpyPlanes={activeSpyPlanes}
          localUsername={username}
          disconnectedTiles={
            showDisconnectedTiles ? disconnectedTiles : undefined
          }
          showDisconnectedTiles={showDisconnectedTiles}
          scoutMissions={scoutMissions
            .filter((m) => m.phase === "outbound" || m.phase === "returning")
            .map((m) => ({
              id: m.id,
              phase: m.phase,
              startedAt: m.startedAt,
              fromX: myPlayer?.posX ?? 0,
              fromY: myPlayer?.posY ?? 0,
              targetX: m.targetX,
              targetY: m.targetY,
              targetUsername: m.targetUsername,
            }))}
        />
      </div>

      <ChatBox
        messages={chatMessages}
        username={username}
        onSend={onSendChat}
      />
      <AttackNotification notifications={attackNotifications} />

      {/* Under attack alert banner */}
      {myBaseUnderAttack && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg font-bold text-sm text-center"
          style={{
            top: 100,
            background: "rgba(200,0,0,0.9)",
            border: "2px solid #ff4444",
            color: "white",
            animation: "pulse 0.8s ease-in-out infinite alternate",
            boxShadow: "0 0 20px rgba(255,0,0,0.6)",
          }}
          data-ocid="game.error_state"
        >
          \uD83D\uDEA8 YOUR BASE IS UNDER ATTACK! \uD83D\uDEA8
        </div>
      )}

      {/* Territory Leaderboard */}
      <TerritoryLeaderboard territory={territory} clans={clans} />
      {/* Day/Night indicator */}
      <div
        className="absolute right-4 z-20 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
        style={{
          top: 44,
          background:
            phase === "day" ? "rgba(255,180,0,0.2)" : "rgba(50,50,150,0.4)",
          border: `1px solid ${phase === "day" ? "rgba(255,180,0,0.5)" : "rgba(100,100,255,0.5)"}`,
          color: phase === "day" ? "#ffcc00" : "#aaaaff",
        }}
      >
        {phase === "day" ? "\u2600\uFE0F Day" : "\uD83C\uDF19 Night"}
      </div>

      {/* Server info */}
      <div
        className="absolute left-4 z-20 text-xs px-2 py-1 rounded"
        style={{
          top: 44,
          background: "rgba(40,25,10,0.85)",
          color: "#D4A96A",
          border: "1px solid rgba(180,140,60,0.3)",
        }}
      >
        \uD83C\uDF0D {serverName} &bull; {players.length + 1} online
      </div>

      {/* Shield status */}
      {myShieldActive && (
        <div
          className="absolute left-4 z-20 text-xs px-2 py-1 rounded"
          style={{
            top: 70,
            background: "rgba(0,80,180,0.4)",
            color: "#55ccff",
            border: "1px solid rgba(0,150,255,0.4)",
          }}
        >
          \uD83D\uDEE1\uFE0F Shield Active
        </div>
      )}

      {/* Clan HQ rebuild notice */}
      {myClan?.hqDestroyedAt &&
        myClan.hqDestroyedAt > 0 &&
        hqRebuildCooldownMs > 0 && (
          <div
            className="absolute left-4 z-20 text-xs px-2 py-1 rounded"
            style={{
              top: 92,
              background: "rgba(80,20,0,0.8)",
              color: "#ff9944",
              border: "1px solid rgba(255,100,0,0.4)",
            }}
          >
            \uD83C\uDFF0 HQ destroyed \u2014 rebuild in{" "}
            {Math.ceil(hqRebuildCooldownMs / 60000)}m
          </div>
        )}

      <MiniMap
        players={players}
        myPlayer={myPlayer}
        clans={clans}
        territory={localTerritory.length > 0 ? localTerritory : territory}
        cameraX={cameraXRef.current}
        cameraY={cameraYRef.current}
        viewW={viewSize.w}
        viewH={viewSize.h}
        onNavigate={navigateTo}
        resources={resources}
        npcBases={npcBases || []}
        dragons={dragons}
        bossNPC={bossNPC}
      />

      {/* Resource stats overlay - bottom left */}
      {myPlayer && (
        <div
          className="absolute bottom-20 left-3 z-20 rounded-lg px-2 py-1.5 text-xs"
          style={{
            background: "rgba(40,25,10,0.92)",
            border: "1px solid rgba(180,140,60,0.3)",
            color: "#ccc",
            maxWidth: 180,
          }}
        >
          <div className="mb-0.5">
            ð² {myPlayer.resources.wood.toLocaleString()} &nbsp;ðª¨{" "}
            {myPlayer.resources.stone.toLocaleString()} &nbsp;ð¾{" "}
            {myPlayer.resources.food.toLocaleString()}
          </div>
          {(myPlayer.gold || 0) > 0 && (
            <div style={{ color: "#ffd700", fontSize: 10 }}>
              ð° {(myPlayer.gold || 0).toLocaleString()} gold
            </div>
          )}
          {myPlayer.troops && (
            <div style={{ color: "#888", fontSize: 10 }}>
              ð¡ï¸ {myPlayer.troops.soldiers.toLocaleString()} | ð¡ï¸{" "}
              {myPlayer.troops.tanks.toLocaleString()} | âï¸{" "}
              {myPlayer.troops.jets.toLocaleString()}
            </div>
          )}
          {myClan && (myClan.clanPoints || 0) > 0 && (
            <div style={{ color: "#ffd700", fontSize: 10, marginTop: 2 }}>
              ð° {(myClan.clanPoints || 0).toLocaleString()} clan pts
            </div>
          )}
          {myClan && (myClan.declaredWars || []).length > 0 && (
            <div style={{ color: "#ff6666", fontSize: 9, marginTop: 2 }}>
              âï¸ At war with {(myClan.declaredWars || []).length} clan(s)
            </div>
          )}
        </div>
      )}

      {/* Clan panel + Declare War - bottom left above control panel */}
      <div
        className="absolute bottom-20 left-3 z-20 flex flex-col gap-2"
        style={{ maxWidth: 190, top: "auto", bottom: 72 }}
      >
        <ClanPanel
          username={username}
          clans={clans}
          serverId={serverId}
          myGold={myGold}
          onCreateClan={(name, color) => {
            if ((myPlayer?.gold || 0) < 10000) {
              toast.error("â Need 10,000 gold to start a clan!");
              return;
            }
            const newGold = (myPlayer?.gold || 0) - 10000;
            localStorage.setItem(`ssmmo_gold_${serverId}`, String(newGold));
            toast.success("ð° Clan created! 10,000 gold spent.");
            onCreateClan(name, color);
          }}
          onJoinClan={onJoinClan}
          onKickMember={onKickMember}
          onLeaveClan={onLeaveClan}
          onSetMOTD={onSetMOTD}
          onPromoteMember={onPromoteMember}
          onDeclareWar={onDeclareWar}
          onEndWar={onEndWar}
          onActivateClanShield={onActivateClanShield}
        />
        {myClan && myClan.leaderUsername === username && (
          <button
            type="button"
            onClick={() => setShowDeclareWar(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{
              background: "rgba(100,10,10,0.85)",
              border: "1px solid rgba(220,50,50,0.5)",
              color: "#ff6666",
            }}
            data-ocid="war.open_modal_button"
          >
            âï¸ Declare War
          </button>
        )}
      </div>

      {/* Zoom controls - top right */}
      <div className="absolute top-4 right-3 z-20 flex flex-col gap-1">
        <button
          type="button"
          data-ocid="game.button"
          onClick={() => gameCanvasRef.current?.zoomIn()}
          style={{
            width: 38,
            height: 34,
            borderRadius: 8,
            background: "rgba(0,0,0,0.55)",
            border: "1.5px solid rgba(255,200,100,0.35)",
            color: "#ffcc66",
            fontSize: 18,
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          data-ocid="game.button"
          onClick={() => gameCanvasRef.current?.zoomOut()}
          style={{
            width: 38,
            height: 34,
            borderRadius: 8,
            background: "rgba(0,0,0,0.55)",
            border: "1.5px solid rgba(255,200,100,0.35)",
            color: "#ffcc66",
            fontSize: 18,
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Zoom Out"
        >
          â
        </button>
      </div>

      {/* Unified Bottom Control Panel */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{
          background: "rgba(5,10,3,0.97)",
          borderTop: "2px solid rgba(100,200,50,0.25)",
          padding: "6px 4px 10px 4px",
        }}
      >
        <div
          className="flex flex-row gap-1.5 overflow-x-auto"
          style={{ scrollbarWidth: "none", paddingBottom: 2 }}
        >
          <HudBtn
            onClick={findMyBase}
            label="My Base"
            icon="ð"
            borderColor="rgba(100,200,255,0.4)"
            iconColor="#66ccff"
          />
          <HudBtn
            onClick={() => {
              if (myPlayer && myPlayer.level >= 200) {
                const p = myPlayer as typeof myPlayer & {
                  base2X?: number;
                  base2Y?: number;
                };
                if (p.base2X !== undefined && p.base2Y !== undefined) {
                  navigateTo(p.base2X, p.base2Y);
                } else {
                  toast.info("No 2nd base found yet. Build one!");
                }
              } else {
                toast.info("\uD83C\uDFDB 2nd Base unlocks at Level 200");
              }
            }}
            label="2nd Base"
            icon="\uD83C\uDFDB"
            borderColor="rgba(120,180,255,0.35)"
            iconColor="#88bbff"
            ocid="game.button"
          />
          <HudBtn
            onClick={findMyHQ}
            label="Find HQ"
            icon="🏰"
            borderColor={
              myClan?.hqPos ? "rgba(160,120,255,0.5)" : "rgba(100,100,100,0.3)"
            }
            iconColor={myClan?.hqPos ? "#bb99ff" : "#666"}
            ocid="game.button"
          />
          <HudBtn
            onClick={() => setAttackMode((v) => !v)}
            label="Attack"
            icon="âï¸"
            active={attackMode}
            activeColor="rgba(200,0,0,0.8)"
            borderColor="rgba(255,80,80,0.4)"
            iconColor="#ff8888"
            ocid="game.toggle"
          />
          <HudBtn
            onClick={() => setShowTraining(true)}
            label="Troops"
            icon="ðª"
            borderColor="rgba(200,100,50,0.4)"
            iconColor="#ff9944"
          />
          <HudBtn
            onClick={() => setShowTraining(true)}
            label="Train"
            icon="â"
            borderColor="rgba(100,200,50,0.4)"
            iconColor="#7DCF45"
          />
          <HudBtn
            onClick={() => setShowUpgrade(true)}
            label="Upgrade"
            icon="â¬ï¸"
            borderColor="rgba(255,180,0,0.4)"
            iconColor="#ffcc44"
          />
          <HudBtn
            onClick={() => setShowTeleport(true)}
            label="Warp"
            icon="⚡"
            borderColor="rgba(80,120,255,0.4)"
            iconColor="#6688ff"
          />
          <HudBtn
            onClick={handleTapWarpToHQ}
            label="Tap Warp"
            icon="📍"
            borderColor="rgba(80,200,255,0.4)"
            iconColor="#44ddff"
            title="Warp to Clan HQ"
            ocid="game.button"
          />
          <HudBtn
            onClick={() => setShowAttackLog((v) => !v)}
            label="Atk Log"
            icon="⚔"
            active={showAttackLog}
            activeColor="rgba(200,50,50,0.6)"
            borderColor={
              showAttackLog ? "rgba(255,60,60,0.55)" : "rgba(200,80,80,0.35)"
            }
            iconColor={showAttackLog ? "#ff6666" : "#cc8888"}
            ocid="attack_log.toggle"
          />
          <HudBtn
            onClick={() => setShowKDScoreboard((v) => !v)}
            label="K/D"
            icon="💀"
            active={showKDScoreboard}
            activeColor="rgba(180,50,200,0.7)"
            borderColor={
              showKDScoreboard
                ? "rgba(200,80,220,0.55)"
                : "rgba(160,60,180,0.35)"
            }
            iconColor={showKDScoreboard ? "#dd88ff" : "#aa66cc"}
            ocid="kd_scoreboard.toggle"
          />
          {myClan && (
            <HudBtn
              onClick={() => setShowDisconnectedTiles((v) => !v)}
              label={`📡 ${disconnectedTiles.length > 0 ? `Disconnected (${disconnectedTiles.length})` : "Connected"}`}
              icon="📡"
              active={showDisconnectedTiles}
              activeColor={
                disconnectedTiles.length > 0
                  ? "rgba(255,80,0,0.7)"
                  : "rgba(50,200,80,0.5)"
              }
              borderColor={
                disconnectedTiles.length > 0
                  ? "rgba(255,80,0,0.6)"
                  : "rgba(50,200,80,0.35)"
              }
              iconColor={disconnectedTiles.length > 0 ? "#ff8844" : "#55ee88"}
              ocid="territory.toggle"
            />
          )}
          {canBuildHQ && myPlayer && (
            <HudBtn
              onClick={() => buildClanHQ(myPlayer.posX, myPlayer.posY)}
              label="Build HQ"
              icon="ð°"
              borderColor={`${myClan?.color || "#888"}55`}
              iconColor={myClan?.color || "#888"}
            />
          )}
          {onClaimNearbyTiles && myClan && (
            <HudBtn
              onClick={() => {
                const result = onClaimNearbyTiles();
                if (result === "no_clan")
                  toast.error("Join a clan to claim territory!");
                else if (result === "cooldown") {
                  const secs = Math.ceil(
                    (claimTileCooldown - Date.now()) / 1000,
                  );
                  toast.info(`Claim on cooldown: ${secs}s`);
                } else {
                  toast.success("Territory claimed! ð´");
                }
              }}
              label={
                claimTileCooldown > Date.now()
                  ? `ð´ ${Math.ceil((claimTileCooldown - Date.now()) / 1000)}s`
                  : "Claim Tile"
              }
              icon="ð´"
              borderColor={`${myClan?.color || "#888"}66`}
              iconColor={myClan?.color || "#aaffaa"}
              ocid="territory.button"
            />
          )}
          <HudBtn
            onClick={() => setShowPlayerList((v) => !v)}
            label="Players"
            icon="ð¥"
            borderColor="rgba(100,200,50,0.4)"
            iconColor="#7DCF45"
          />
          <HudBtn
            onClick={() => setShowHospital((v) => !v)}
            label="Hospital"
            icon="ð¥"
            borderColor="rgba(80,220,130,0.4)"
            iconColor="#50ee88"
            ocid="game.button"
          />
          <HudBtn
            onClick={() => setShowShop(true)}
            label="Shop"
            icon="ð°"
            borderColor="rgba(255,200,0,0.4)"
            iconColor="#ffd700"
            ocid="shop.open_modal_button"
          />
          <HudBtn
            onClick={() => {
              if (spyPlaneCount <= 0) {
                toast.error("No spy planes! Buy them in the Shop.");
                return;
              }
              if (onDeploySpyPlane) {
                const ok = onDeploySpyPlane();
                if (ok) {
                  setSpyPlaneCount((prev) => Math.max(0, prev - 1));
                  toast.success(
                    "🛩 Spy Plane deployed! Reveals area for 10 minutes.",
                  );
                }
              }
            }}
            label={`Spy 🛩 x${spyPlaneCount}`}
            icon="🛩"
            borderColor={
              spyPlaneCount > 0 ? "rgba(0,200,255,0.5)" : "rgba(80,80,80,0.3)"
            }
            iconColor={spyPlaneCount > 0 ? "#00eeff" : "#555"}
            ocid="game.spy_plane_button"
          />
          {myClan && (
            <HudBtn
              onClick={() => setShowClanChat((v) => !v)}
              label="Clan Chat"
              icon="ð¬"
              active={showClanChat}
              activeColor={`${myClan.color}44`}
              borderColor={`${myClan.color}66`}
              iconColor={myClan.color}
              ocid="game.toggle"
            />
          )}
          <HudBtn
            onClick={handleShareLink}
            label="Share"
            icon="ð"
            borderColor="rgba(100,200,50,0.4)"
            iconColor="#7DCF45"
            ocid="game.share_button"
          />
          <HudBtn
            onClick={() => setShowMenu((v) => !v)}
            label="Menu"
            icon="â°"
            borderColor="rgba(100,200,50,0.4)"
            iconColor="#7DCF45"
          />
          <HudBtn
            onClick={() => setShowAdminPrompt(true)}
            label="Admin"
            icon="âï¸"
            borderColor="rgba(100,50,50,0.4)"
            iconColor="#ff6644"
          />
          <HudBtn
            onClick={toggleFullscreen}
            label={isFullscreen ? "Exit FS" : "Fullscreen"}
            icon="â¶"
            borderColor="rgba(255,200,50,0.4)"
            iconColor="#ffcc44"
            ocid="game.toggle"
          />
        </div>
      </div>

      {/* Attack mode banner */}
      {attackMode && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg text-sm font-bold"
          style={{
            bottom: 90,
            background: "rgba(180,0,0,0.8)",
            border: "1px solid #ff4444",
            color: "#fff",
            pointerEvents: "none",
          }}
        >
          \u2694\uFE0F ATTACK MODE \u2014 Tap enemy, resource, BOSS or HQ
        </div>
      )}

      {/* SableSoulreaver wave indicator */}
      {username === "SableSoulreaver" && (
        <div
          className="absolute z-30 px-3 py-1 rounded-lg text-xs font-bold"
          style={{
            bottom: 130,
            right: 12,
            background: "rgba(80,0,120,0.85)",
            border: "1px solid #cc44ff",
            color: "#ff88ff",
            pointerEvents: "none",
          }}
          data-ocid="game.panel"
        >
          ⚡ Waves:{" "}
          {
            marchingArmies.filter(
              (m) =>
                m.attackerUsername === "SableSoulreaver" &&
                m.targetType !== "return",
            ).length
          }
          /50
        </div>
      )}

      {/* Active marching armies \u2014 Cancel March buttons */}
      {activeMarchingArmies.length > 0 && (
        <div
          className="absolute z-30 flex flex-col gap-1"
          style={{ bottom: 150, left: "50%", transform: "translateX(-50%)" }}
        >
          {activeMarchingArmies.map((march) => {
            const elapsed = Date.now() - march.startTime;
            const remaining = Math.max(0, (march.duration - elapsed) / 1000);
            const mins = Math.floor(remaining / 60);
            const secs = Math.floor(remaining % 60);
            return (
              <div
                key={march.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{
                  background: "rgba(180,0,0,0.85)",
                  border: "1px solid #ff4444",
                  color: "#fff",
                }}
              >
                <span>
                  \u2694\uFE0F {march.targetLabel} \u2014 {mins}m {secs}s
                </span>
                <button
                  type="button"
                  onClick={() => cancelMarch(march.id)}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: "#ffaaaa",
                  }}
                  data-ocid="march.cancel_button"
                >
                  Cancel March
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Click-to-claim empty tile popup */}
      {claimPopup && (
        <div
          role="presentation"
          className="fixed inset-0 z-40"
          onClick={() => setClaimPopup(null)}
          onKeyDown={(e) => e.key === "Escape" && setClaimPopup(null)}
          style={{ pointerEvents: "all" }}
        >
          <dialog
            aria-label="Claim territory"
            className="absolute rounded-xl p-4 w-64 shadow-xl"
            open
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "#0d1f0a",
              border: "2px solid #4caf50",
              zIndex: 41,
              margin: 0,
              padding: "1rem",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            data-ocid="territory.dialog"
          >
            <div
              className="text-sm font-bold mb-2"
              style={{ color: "#66ee66" }}
            >
              📌 Unclaimed Territory
            </div>
            <div className="text-xs mb-1" style={{ color: "#aaa" }}>
              Cell ({claimPopup.cellX}, {claimPopup.cellY})
            </div>
            {(() => {
              const myClan4 = clans.find((c) =>
                c.memberUsernames.includes(username),
              );
              if (!myClan4) {
                return (
                  <div className="text-xs mb-3" style={{ color: "#ff9944" }}>
                    Join a clan to claim territory.
                  </div>
                );
              }
              const cooldownLeft = Math.max(
                0,
                (claimTileCooldown || 0) - Date.now(),
              );
              return (
                <>
                  <div className="text-xs mb-3" style={{ color: "#aaa" }}>
                    Claim this tile for{" "}
                    <span style={{ color: myClan4.color }}>{myClan4.name}</span>
                    ?
                  </div>
                  {cooldownLeft > 0 ? (
                    <div
                      className="text-xs py-2 text-center rounded"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "#888",
                        border: "1px solid #333",
                      }}
                      data-ocid="territory.loading_state"
                    >
                      ⏳ Cooldown: {Math.ceil(cooldownLeft / 1000)}s
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!onClaimNearbyTiles) return;
                        // Manually claim this specific tile
                        const result = onClaimNearbyTiles();
                        if (result === "no_clan") {
                          toast.error("Join a clan to claim territory!");
                        } else if (result === "cooldown") {
                          toast.error("Claim tile on cooldown!");
                        } else {
                          toast.success("📌 Territory claimed!");
                        }
                        setClaimPopup(null);
                      }}
                      className="w-full py-2 rounded-lg text-sm font-bold mb-2"
                      style={{
                        background: myClan4.color,
                        color: "#fff",
                        border: "none",
                      }}
                      data-ocid="territory.primary_button"
                    >
                      🏴 Claim
                    </button>
                  )}
                </>
              );
            })()}
            <button
              type="button"
              onClick={() => setClaimPopup(null)}
              className="w-full py-1.5 rounded-lg text-xs"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#aaa",
                border: "1px solid #333",
              }}
              data-ocid="territory.close_button"
            >
              ✕ Close
            </button>
          </dialog>
        </div>
      )}

      {/* Attack confirmation */}
      {attackTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          data-ocid="attack.dialog"
        >
          <div
            className="rounded-xl p-5 w-72"
            style={{ background: "#1a0f05", border: "2px solid #ff4444" }}
          >
            <h3
              className="text-base font-bold mb-2"
              style={{ color: "#ff4444" }}
            >
              \u2694\uFE0F Confirm Attack
            </h3>
            <p className="text-sm mb-4" style={{ color: "#ddd" }}>
              {attackTarget === "boss" ? (
                `Attack the BOSS fortress for ${20 * Math.max(1, upgrades.attackPower)} damage?`
              ) : isNPCBase(attackTarget) ? (
                <>
                  Attack {attackTarget.memberName} (The Unspeaken Ones)?
                  <br />
                  HP: {attackTarget.hp}/{attackTarget.maxHp} | Wall:{" "}
                  {attackTarget.wallHp}/{attackTarget.maxWallHp} | Troops:{" "}
                  {attackTarget.troops.toLocaleString()}
                </>
              ) : "posX" in attackTarget ? (
                `Attack ${(attackTarget as GamePlayer).username}'s base?${
                  (attackTarget as GamePlayer).shieldActive
                    ? " \u26A0\uFE0F Enemy has a shield \u2014 you need to be at war to bypass it!"
                    : ""
                }`
              ) : (
                `Attack ${(attackTarget as ResourceField).type} resource field? ${
                  ((attackTarget as ResourceField).guardStrength ?? 0) > 0
                    ? `Guards: ${(attackTarget as ResourceField).guardStrength}`
                    : (attackTarget as ResourceField).occupyingTroops
                      ? `Enemy troops occupying: ${(attackTarget as ResourceField).occupyingTroops?.count}`
                      : "No defenders"
                }`
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmAttack}
                className="flex-1 py-2 rounded-lg font-bold text-sm"
                style={{ background: "#aa1a1a", color: "white" }}
                data-ocid="attack.confirm_button"
              >
                Attack!
              </button>
              {attackTarget &&
                attackTarget !== "boss" &&
                !isNPCBase(attackTarget) &&
                "posX" in (attackTarget as object) &&
                !(attackTarget as GamePlayer).shieldActive && (
                  <button
                    type="button"
                    onClick={() => {
                      launchScoutMission(attackTarget as GamePlayer);
                      setAttackTarget(null);
                    }}
                    disabled={spyPlaneCount <= 0}
                    className="flex-1 py-2 rounded-lg font-bold text-sm"
                    style={{
                      background: spyPlaneCount > 0 ? "#005577" : "#222",
                      color: spyPlaneCount > 0 ? "#00eeff" : "#555",
                      border:
                        spyPlaneCount > 0
                          ? "1px solid #00eeff66"
                          : "1px solid #333",
                    }}
                    data-ocid="attack.scout_button"
                  >
                    🛩 Scout
                  </button>
                )}
              <button
                type="button"
                onClick={() => setAttackTarget(null)}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ background: "rgba(255,255,255,0.1)", color: "#aaa" }}
                data-ocid="attack.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Intel Report Modal ───────────────────────────────────────────── */}
      {intelReport?.intel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.8)" }}
          data-ocid="intel.dialog"
        >
          <div
            className="rounded-xl p-5 w-80"
            style={{
              background: "#060e14",
              border: "2px solid #00eeff",
              boxShadow: "0 0 30px rgba(0,238,255,0.25)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold" style={{ color: "#00eeff" }}>
                🛩 INTEL REPORT
              </h3>
              <span className="text-xs" style={{ color: "#669" }}>
                {new Date(intelReport.intel.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-xs mb-3" style={{ color: "#88aacc" }}>
              Target:{" "}
              <span style={{ color: "#fff", fontWeight: "bold" }}>
                {intelReport.targetUsername}
              </span>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <div
                className="flex justify-between items-center py-1 px-2 rounded"
                style={{
                  background: "rgba(0,238,255,0.05)",
                  border: "1px solid rgba(0,238,255,0.1)",
                }}
              >
                <span className="text-xs" style={{ color: "#aac" }}>
                  🪖 Troops
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "#00eeff" }}
                >
                  {intelReport.intel.troops.toLocaleString()}
                </span>
              </div>
              <div
                className="flex justify-between items-center py-1 px-2 rounded"
                style={{
                  background: "rgba(0,238,255,0.05)",
                  border: "1px solid rgba(0,238,255,0.1)",
                }}
              >
                <span className="text-xs" style={{ color: "#aac" }}>
                  🚗 Tanks
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "#00eeff" }}
                >
                  {intelReport.intel.tanks.toLocaleString()}
                </span>
              </div>
              <div
                className="flex justify-between items-center py-1 px-2 rounded"
                style={{
                  background: "rgba(0,238,255,0.05)",
                  border: "1px solid rgba(0,238,255,0.1)",
                }}
              >
                <span className="text-xs" style={{ color: "#aac" }}>
                  ✈️ Jets
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "#00eeff" }}
                >
                  {intelReport.intel.jets.toLocaleString()}
                </span>
              </div>
              <div
                className="py-1 px-2 rounded"
                style={{
                  background: "rgba(0,238,255,0.05)",
                  border: "1px solid rgba(0,238,255,0.1)",
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs" style={{ color: "#aac" }}>
                    🧱 Wall HP
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: "#00eeff" }}
                  >
                    {intelReport.intel.wallHp.toLocaleString()} /{" "}
                    {intelReport.intel.maxWallHp.toLocaleString()}
                  </span>
                </div>
                <div
                  className="w-full h-2 rounded-full"
                  style={{ background: "rgba(0,50,80,0.8)" }}
                >
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, (intelReport.intel.wallHp / Math.max(1, intelReport.intel.maxWallHp)) * 100))}%`,
                      background:
                        intelReport.intel.wallHp /
                          Math.max(1, intelReport.intel.maxWallHp) >
                        0.5
                          ? "#00eeff"
                          : intelReport.intel.wallHp /
                                Math.max(1, intelReport.intel.maxWallHp) >
                              0.25
                            ? "#ffaa00"
                            : "#ff4444",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIntelReport(null)}
              className="w-full py-2 rounded-lg text-sm font-bold"
              style={{
                background: "rgba(0,238,255,0.15)",
                color: "#00eeff",
                border: "1px solid rgba(0,238,255,0.3)",
              }}
              data-ocid="intel.close_button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Garrison dialog */}
      {pendingGarrison && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          data-ocid="garrison.dialog"
        >
          <div
            className="rounded-xl p-5 w-80"
            style={{ background: "#1a0f05", border: "2px solid #ffaa44" }}
          >
            <h3
              className="text-base font-bold mb-2"
              style={{ color: "#ffaa44" }}
            >
              \uD83D\uDDE1\uFE0F Garrison Troops?
            </h3>
            <p className="text-sm mb-4" style={{ color: "#ccc" }}>
              Leave troops to garrison the {pendingGarrison.fieldType} field?
              {pendingGarrison.fieldType === "gold" ? (
                <span
                  style={{ color: "#ffd700", display: "block", marginTop: 4 }}
                >
                  \u2B50 GOLD FIELD! Worth 1,000 gold to your clan upon capture!
                </span>
              ) : (
                " You must garrison troops to gain resources from this field."
              )}
            </p>
            <div className="flex flex-col gap-2">
              {[50, 100, 200].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    onGarrisonTroops(pendingGarrison.fieldId, count);
                    if (pendingGarrison.fieldType === "gold") {
                      const newGold = (myPlayer?.gold || 0) + 1000;
                      localStorage.setItem(
                        `ssmmo_gold_${serverId}`,
                        String(newGold),
                      );
                      toast.success(
                        "\u2B50 GOLD FIELD CAPTURED! +1,000 gold added to your treasury!",
                      );
                    } else {
                      toast.success(
                        `${count} troops garrisoned! You will now gain resources every 30 seconds.`,
                      );
                    }
                    setPendingGarrison(null);
                  }}
                  className="py-2 rounded-lg font-bold text-sm"
                  style={{
                    background: "rgba(180,120,30,0.35)",
                    color: "#ffcc66",
                    border: "1px solid rgba(200,150,50,0.4)",
                  }}
                  data-ocid="garrison.button"
                >
                  \uD83D\uDDE1\uFE0F Leave {count} Troops
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPendingGarrison(null)}
                className="py-2 rounded-lg text-sm"
                style={{ background: "rgba(255,255,255,0.08)", color: "#888" }}
                data-ocid="garrison.cancel_button"
              >
                Skip (no resource gain)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Territory Tile Interaction Panel */}
      {tappedTerritoryCell &&
        myClan &&
        (() => {
          const tile = localTerritory.find(
            (t) =>
              t.cellX === tappedTerritoryCell.cellX &&
              t.cellY === tappedTerritoryCell.cellY,
          );
          const isMyTile = tile?.clanId === myClan.id;
          const enemyClan = isMyTile
            ? null
            : clans.find((c) => c.id === tile?.clanId);
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.7)" }}
              data-ocid="territory.dialog"
            >
              <div
                className="rounded-xl p-5 w-80"
                style={{
                  background: "#0a1a05",
                  border: `2px solid ${isMyTile ? myClan?.color || "#44aa44" : "#ff4444"}`,
                }}
              >
                <h3
                  className="text-base font-bold mb-2"
                  style={{
                    color: isMyTile ? myClan?.color || "#44aa44" : "#ff6666",
                  }}
                >
                  {isMyTile
                    ? `🏴 Your Territory (${tappedTerritoryCell.cellX}, ${tappedTerritoryCell.cellY})`
                    : `⚔ Enemy Territory (${tappedTerritoryCell.cellX}, ${tappedTerritoryCell.cellY})`}
                </h3>
                {isMyTile ? (
                  <div>
                    <div className="text-xs mb-3" style={{ color: "#aaa" }}>
                      {tile?.occupyingTroops
                        ? `🪖 ${tile.occupyingTroops.count} troops garrisoned here`
                        : "No troops garrisoned"}
                    </div>
                    {tile?.occupyingTroops ? (
                      <button
                        type="button"
                        onClick={() => {
                          returnTroopsFromTile(
                            tappedTerritoryCell.cellX,
                            tappedTerritoryCell.cellY,
                          );
                          setTappedTerritoryCell(null);
                        }}
                        className="w-full py-2 rounded-lg text-sm font-bold mb-2"
                        style={{
                          background: "rgba(100,200,100,0.25)",
                          color: "#88ff88",
                        }}
                        data-ocid="territory.button"
                      >
                        🏃 Return Troops to Base
                      </button>
                    ) : (
                      <div className="mb-3">
                        <div className="text-xs mb-1" style={{ color: "#aaa" }}>
                          Leave troops to occupy:
                        </div>
                        <div className="flex gap-2 mb-2">
                          {[50, 100, 200, 500].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setGarrisonTileCount(n)}
                              className="flex-1 py-1 rounded text-xs"
                              style={{
                                background:
                                  garrisonTileCount === n
                                    ? "rgba(100,200,100,0.3)"
                                    : "rgba(255,255,255,0.07)",
                                color:
                                  garrisonTileCount === n ? "#88ff88" : "#aaa",
                                border:
                                  garrisonTileCount === n
                                    ? "1px solid #44aa44"
                                    : "1px solid transparent",
                              }}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            garrisonOnTerritoryTile(
                              tappedTerritoryCell.cellX,
                              tappedTerritoryCell.cellY,
                              garrisonTileCount,
                            );
                            setTappedTerritoryCell(null);
                          }}
                          className="w-full py-2 rounded-lg text-sm font-bold"
                          style={{
                            background: "rgba(60,160,60,0.4)",
                            color: "#aaffaa",
                          }}
                          data-ocid="territory.primary_button"
                        >
                          🪖 Garrison {garrisonTileCount} Troops
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs mb-3" style={{ color: "#ccc" }}>
                      {enemyClan
                        ? `Owned by ${enemyClan.name}. Garrison: ${tile?.occupyingTroops?.count ?? 500} troops.`
                        : "Enemy territory."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        attackTerritoryTile(
                          tappedTerritoryCell.cellX,
                          tappedTerritoryCell.cellY,
                        );
                        setTappedTerritoryCell(null);
                      }}
                      className="w-full py-2 rounded-lg font-bold text-sm mb-2"
                      style={{ background: "#aa1a1a", color: "white" }}
                      data-ocid="territory.primary_button"
                    >
                      ⚔ Attack Territory!
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setTappedTerritoryCell(null)}
                  className="w-full py-2 rounded-lg text-sm mt-1"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#aaa",
                  }}
                  data-ocid="territory.cancel_button"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}

      {/* Declare War modal */}
      {showDeclareWar && myClan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          data-ocid="war.dialog"
        >
          <div
            className="rounded-xl p-5 w-80 max-h-96 flex flex-col"
            style={{ background: "#1a0505", border: "2px solid #cc2222" }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold" style={{ color: "#ff4444" }}>
                \u2694\uFE0F War Declaration
              </h3>
              <button
                type="button"
                onClick={() => setShowDeclareWar(false)}
                style={{
                  color: "#888",
                  background: "none",
                  border: "none",
                  fontSize: 16,
                }}
                data-ocid="war.close_button"
              >
                \u00d7
              </button>
            </div>

            {/* Active wars */}
            {(myClan.declaredWars || []).length > 0 && (
              <div className="mb-3">
                <div
                  className="text-xs font-bold mb-1"
                  style={{ color: "#ff8888" }}
                >
                  Active Wars:
                </div>
                {(myClan.declaredWars || []).map((wClanId) => {
                  const wClan = clans.find((c) => c.id === wClanId);
                  if (!wClan) return null;
                  return (
                    <div
                      key={wClanId}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: wClan.color }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: wClan.color }}
                        >
                          {wClan.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEndWar(wClanId)}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: "rgba(100,200,50,0.2)",
                          color: "#88dd44",
                        }}
                        data-ocid="war.button"
                      >
                        End War
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-xs font-bold mb-2" style={{ color: "#aaa" }}>
              Declare War on:
            </div>
            <div className="overflow-y-auto flex-1" style={{ maxHeight: 200 }}>
              {otherClans.length === 0 ? (
                <div
                  className="text-xs text-center py-4"
                  style={{ color: "#666" }}
                >
                  No other clans on this server
                </div>
              ) : (
                otherClans.map((oc) => {
                  const alreadyAtWar =
                    (myClan.declaredWars || []).includes(oc.id) ||
                    (oc.declaredWars || []).includes(myClan.id);
                  return (
                    <div
                      key={oc.id}
                      className="flex items-center justify-between py-1"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: oc.color }}
                        />
                        <span className="text-xs">{oc.name}</span>
                        {alreadyAtWar && (
                          <span
                            className="text-xs px-1 rounded"
                            style={{
                              background: "rgba(255,50,50,0.2)",
                              color: "#ff6666",
                            }}
                          >
                            AT WAR
                          </span>
                        )}
                      </div>
                      {!alreadyAtWar && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeclareWar(oc.id);
                            toast.error(
                              `\u2694\uFE0F War declared on [${oc.name}]! Their shields are now bypassed.`,
                            );
                          }}
                          className="text-xs px-2 py-0.5 rounded font-bold"
                          style={{
                            background: "rgba(200,30,30,0.3)",
                            color: "#ff6666",
                            border: "1px solid rgba(200,50,50,0.4)",
                          }}
                          data-ocid="war.button"
                        >
                          Declare War
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDeclareWar(false)}
              className="w-full py-2 rounded-lg text-sm mt-3"
              style={{ background: "rgba(255,255,255,0.08)", color: "#888" }}
              data-ocid="war.cancel_button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Admin password prompt */}
      {showAdminPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="rounded-xl p-5 w-72"
            style={{ background: "#1a0f05", border: "2px solid #5a1a1a" }}
          >
            <h3
              className="text-base font-bold mb-2"
              style={{ color: "#ff6644" }}
            >
              \uD83D\uDD27 Admin Access
            </h3>
            <p className="text-xs mb-3" style={{ color: "#aaa" }}>
              Enter admin password:
            </p>
            <input
              className="w-full px-3 py-2 rounded mb-2 text-sm"
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setAdminError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdminSubmit()}
              data-ocid="admin.input"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,100,50,0.4)",
                color: "white",
                outline: "none",
              }}
            />
            {adminError && (
              <div className="text-xs mb-2" style={{ color: "#ff4444" }}>
                {adminError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdminSubmit}
                className="flex-1 py-2 rounded-lg font-bold text-sm"
                style={{ background: "#5a1a1a", color: "white" }}
                data-ocid="admin.submit_button"
              >
                Enter
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdminPrompt(false);
                  setAdminPassword("");
                  setAdminError("");
                }}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ background: "rgba(255,255,255,0.1)", color: "#aaa" }}
                data-ocid="admin.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin panel */}
      {showAdmin && (
        <AdminPanel
          username={username}
          players={players}
          serverId={serverId}
          myPlayer={myPlayer}
          myShieldActive={myShieldActive}
          shieldCooldownUntil={shieldCooldownUntil}
          upgrades={upgrades}
          onBroadcast={(msg) => onSendChat(`[ADMIN] ${msg}`)}
          onInitResources={onInitResources}
          onToggleShield={onToggleShield}
          onKickAndNuke={handleKickAndNuke}
          onBanPlayer={handleBanPlayer}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* Menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="rounded-xl p-5 w-64"
            style={{
              background: "#1a0f05",
              border: "1px solid rgba(180,140,60,0.4)",
            }}
          >
            <h3
              className="text-base font-bold mb-4 text-center"
              style={{ color: "#D4A96A" }}
            >
              Menu
            </h3>
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-2 rounded-lg text-sm font-bold mb-2"
              style={{ background: "#1a3a10", color: "#7DCF45" }}
              data-ocid="menu.button"
            >
              \uD83D\uDCBE Save Game
            </button>
            <button
              type="button"
              onClick={handleLoad}
              className="w-full py-2 rounded-lg text-sm font-bold mb-2"
              style={{ background: "#1a2a3a", color: "#45a8cf" }}
              data-ocid="menu.button"
            >
              \uD83D\uDCC2 Load Game
            </button>
            <button
              type="button"
              onClick={handleShareLink}
              className="w-full py-2 rounded-lg text-sm font-bold mb-4"
              style={{ background: "#2a1a4a", color: "#cc88ff" }}
              data-ocid="menu.button"
            >
              \uD83D\uDD17 Share Link (Invite Friends)
            </button>
            <button
              type="button"
              onClick={() => setShowMenu(false)}
              className="w-full py-2 rounded-lg text-sm"
              style={{ background: "rgba(255,255,255,0.1)", color: "#aaa" }}
              data-ocid="menu.cancel_button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Player list */}
      {showPlayerList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="rounded-xl p-5 w-64 max-h-96"
            style={{
              background: "#1a0f05",
              border: "1px solid rgba(180,140,60,0.3)",
            }}
          >
            <div className="flex justify-between mb-3">
              <h3 className="text-base font-bold" style={{ color: "#D4A96A" }}>
                Players Online
              </h3>
              <button
                type="button"
                onClick={() => setShowPlayerList(false)}
                className="text-gray-400"
                data-ocid="playerlist.close_button"
              >
                \u00d7
              </button>
            </div>
            <div className="overflow-y-auto max-h-64">
              <div
                className="flex items-center gap-2 py-1.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: myClan?.color || "#888" }}
                />
                <div className="flex-1">
                  <div
                    className="text-xs font-bold"
                    style={{ color: "#D4A96A" }}
                  >
                    {username} (You)
                  </div>
                  {myClan && (
                    <div className="text-xs" style={{ color: myClan.color }}>
                      [{myClan.name}]
                    </div>
                  )}
                </div>
                <div className="text-xs" style={{ color: "#aaa" }}>
                  HP: {myPlayer?.hp.toLocaleString() || 100}
                </div>
              </div>
              {players
                .filter((p) => p.serverId === serverId)
                .map((p) => {
                  const pc = clans.find((c) =>
                    c.memberUsernames.includes(p.username),
                  );
                  return (
                    <div
                      key={p.username}
                      className="flex items-center gap-2 py-1.5"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: pc?.color || "#888" }}
                      />
                      <div className="flex-1 min-w-0">
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: game tap interaction */}
                        <div
                          className="text-xs font-semibold truncate cursor-pointer hover:underline"
                          style={{ color: "#D4A96A" }}
                          onClick={() => {
                            navigateTo(p.posX, p.posY);
                            setShowPlayerList(false);
                            toast(`👁 Viewing ${p.username}'s base`, {
                              duration: 2000,
                            });
                          }}
                          title="Tap to view base on map"
                        >
                          {p.username}
                        </div>
                        {pc && (
                          <div
                            className="text-xs truncate"
                            style={{ color: pc.color }}
                          >
                            [{pc.name}]
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="text-xs" style={{ color: "#aaa" }}>
                          HP: {p.hp.toLocaleString()}
                        </div>
                        {!myClan?.memberUsernames.includes(p.username) && (
                          <button
                            type="button"
                            onClick={() => {
                              onSendClanInvite(p.username);
                              toast.success(
                                `Clan invite sent to ${p.username}!`,
                              );
                            }}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              background: "rgba(100,200,50,0.15)",
                              color: "#7DCF45",
                              border: "1px solid rgba(100,200,50,0.3)",
                            }}
                            data-ocid="playerlist.button"
                          >
                            + Invite
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            <button
              type="button"
              onClick={() => setShowPlayerList(false)}
              className="w-full mt-3 py-2 rounded text-sm"
              style={{ background: "rgba(255,255,255,0.08)", color: "#888" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Clan invites */}
      {clanInvites.length > 0 && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2"
          style={{ maxWidth: 300 }}
        >
          {clanInvites.map((inv) => (
            <div
              key={inv.id}
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background: "rgba(10,20,5,0.95)",
                border: `2px solid ${inv.clanColor}`,
                color: "white",
              }}
              data-ocid="invite.dialog"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ background: inv.clanColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">
                  {inv.fromUsername} invited you to [{inv.clanName}]!
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onAcceptInvite(inv.id, inv.clanId)}
                  className="px-2 py-1 rounded text-xs font-bold"
                  style={{
                    background: "rgba(50,200,50,0.3)",
                    color: "#7DCF45",
                    border: "1px solid rgba(100,200,50,0.5)",
                  }}
                  data-ocid="invite.confirm_button"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => onDeclineInvite(inv.id)}
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    background: "rgba(200,50,50,0.2)",
                    color: "#ff8888",
                  }}
                  data-ocid="invite.cancel_button"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Crop Modal */}
      {cropState && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.88)" }}
          data-ocid="photo.crop.modal"
        >
          <div
            className="rounded-2xl p-5 flex flex-col items-center gap-3"
            style={{
              background: "#110a02",
              border: "2px solid rgba(180,140,60,0.6)",
              maxWidth: "92vw",
              width: 340,
            }}
          >
            <h3 className="text-base font-bold" style={{ color: "#D4A96A" }}>
              ✂️ Crop &amp; Position Photo
            </h3>
            <p className="text-xs text-center" style={{ color: "#999" }}>
              Drag to pan • +/− to zoom
            </p>
            <div
              style={{
                width: CROP_SIZE,
                height: CROP_SIZE,
                overflow: "hidden",
                position: "relative",
                borderRadius: 8,
                cursor: "grab",
                touchAction: "none",
                border: "2px solid rgba(180,140,60,0.7)",
                userSelect: "none",
                flexShrink: 0,
              }}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerLeave={handleCropPointerUp}
              data-ocid="photo.canvas_target"
            >
              <img
                src={cropState.imageUrl}
                alt="Crop preview"
                draggable={false}
                style={{
                  position: "absolute",
                  maxWidth: "none",
                  width: "auto",
                  height: "auto",
                  transform: `translate(calc(-50% + ${cropState.offsetX}px), calc(-50% + ${cropState.offsetY}px)) scale(${cropState.scale})`,
                  top: "50%",
                  left: "50%",
                  transformOrigin: "center",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  boxShadow: "inset 0 0 0 2px rgba(255,200,80,0.8)",
                  borderRadius: 8,
                }}
              />
            </div>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() =>
                  setCropState((p) =>
                    p ? { ...p, scale: Math.max(0.3, p.scale - 0.1) } : p,
                  )
                }
                className="w-10 h-10 rounded-full font-bold text-xl flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#D4A96A",
                  flexShrink: 0,
                }}
                data-ocid="photo.crop.secondary_button"
              >
                −
              </button>
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.05"
                value={cropState.scale}
                onChange={(e) =>
                  setCropState((p) =>
                    p ? { ...p, scale: Number.parseFloat(e.target.value) } : p,
                  )
                }
                className="flex-1"
                style={{ accentColor: "#D4A96A" }}
                data-ocid="photo.crop.select"
              />
              <button
                type="button"
                onClick={() =>
                  setCropState((p) =>
                    p ? { ...p, scale: Math.min(3, p.scale + 0.1) } : p,
                  )
                }
                className="w-10 h-10 rounded-full font-bold text-xl flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#D4A96A",
                  flexShrink: 0,
                }}
                data-ocid="photo.crop.primary_button"
              >
                +
              </button>
            </div>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setCropState(null)}
                className="flex-1 py-2 rounded-xl font-bold text-sm"
                style={{ background: "rgba(255,255,255,0.08)", color: "#888" }}
                data-ocid="photo.crop.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropApply}
                className="flex-1 py-2 rounded-xl font-bold text-sm"
                style={{ background: "#1a3a10", color: "#7DCF45" }}
                data-ocid="photo.crop.confirm_button"
              >
                ✅ Apply to Base
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo upload dialog */}
      {showPhotoUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          data-ocid="photo.dialog"
        >
          <div
            className="rounded-xl p-5 w-72"
            style={{
              background: "#1a0f05",
              border: "2px solid rgba(180,140,60,0.4)",
            }}
          >
            <h3
              className="text-base font-bold mb-2"
              style={{ color: "#D4A96A" }}
            >
              \uD83D\uDDBC\uFE0F Set Base Photo
            </h3>
            {myPlayer?.basePhotoUrl ? (
              <div className="mb-4">
                <p
                  className="text-xs mb-1 font-semibold"
                  style={{ color: "#D4A96A" }}
                >
                  Current Photo
                </p>
                <img
                  src={myPlayer.basePhotoUrl}
                  alt="Current base"
                  className="w-full rounded-lg object-cover"
                  style={{ maxHeight: "8rem" }}
                />
              </div>
            ) : (
              <p className="text-xs mb-4 italic" style={{ color: "#888" }}>
                No photo set â using default fortress
              </p>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 rounded-lg font-bold text-sm mb-2"
              style={{ background: "#1a3a10", color: "#7DCF45" }}
              data-ocid="photo.upload_button"
            >
              \uD83D\uDCF7 Choose Photo from Gallery
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoFileChange}
              style={{ display: "none" }}
            />
            {myPlayer?.basePhotoUrl && (
              <button
                type="button"
                onClick={handlePhotoRemove}
                className="w-full py-2 rounded-lg font-bold text-sm mb-2"
                style={{ background: "#3a1010", color: "#ef4444" }}
                data-ocid="photo.remove_button"
              >
                \uD83D\uDDD1\uFE0F Remove Photo (Restore Default)
              </button>
            )}
            {/* Tornado Shelter */}
            <div
              className="border-t mt-2 pt-2"
              style={{ borderColor: "rgba(180,140,60,0.2)" }}
            >
              <p
                className="text-xs mb-2 font-semibold"
                style={{ color: "#D4A96A" }}
              >
                🏠 Tornado Shelter
              </p>
              {hasTornadoShelter ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2 rounded-lg font-bold text-sm mb-2 opacity-60"
                  style={{
                    background: "rgba(56,161,105,0.3)",
                    color: "#68D391",
                  }}
                  data-ocid="shelter.button"
                >
                  ✅ Tornado Shelter Built
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!myPlayer) return;
                    if (myGold < 50000) {
                      toast.error(
                        "Not enough gold! Need 50,000 gold to build a Tornado Shelter.",
                      );
                      return;
                    }
                    const newShelterGold = Math.max(
                      0,
                      (myPlayer.gold || 0) - 50000,
                    );
                    localStorage.setItem(
                      `ssmmo_gold_${serverId}`,
                      String(newShelterGold),
                    );
                    setHasTornadoShelter(true);
                    toast(
                      "🏠 Tornado Shelter constructed! Your base is now protected from tornadoes.",
                      {
                        duration: 5000,
                        style: {
                          background: "rgba(0,50,20,0.95)",
                          border: "2px solid #38A169",
                          color: "#68D391",
                        },
                      },
                    );
                  }}
                  className="w-full py-2 rounded-lg font-bold text-sm mb-2"
                  style={{ background: "#1a3a10", color: "#7DCF45" }}
                  data-ocid="shelter.button"
                >
                  🏠 Build Tornado Shelter (50,000 gold)
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPhotoUpload(false)}
              className="w-full py-2 rounded-lg text-sm"
              style={{ background: "rgba(255,255,255,0.08)", color: "#888" }}
              data-ocid="photo.cancel_button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Shop panel */}
      {showShop && (
        <ShopPanel
          gold={myGold}
          onBuy={handleShopBuy}
          onClose={() => setShowShop(false)}
          isClanOwner={!!(myClan && myClan.leaderUsername === username)}
          hasClanDragon={hasClanDragon}
          hasSpecialForces={hasSpecialForces}
          hasHacker={hasHacker}
          antiAirCount={antiAirCount}
          serverId={serverId}
        />
      )}

      {/* Hospital panel */}
      {showHospital && (
        <HospitalPanel
          troops={localTroops}
          gold={myGold}
          onDeductGold={(amount) => {
            if (myPlayer) {
              const newGold = Math.max(0, (myPlayer.gold || 0) - amount);
              localStorage.setItem(`ssmmo_gold_${serverId}`, String(newGold));
            }
          }}
          onHealComplete={handleHealComplete}
          onClose={() => setShowHospital(false)}
        />
      )}

      {/* Clan Chat panel */}
      {showClanChat && myClan && (
        <ClanChatPanel
          username={username}
          myClan={myClan}
          onClose={() => setShowClanChat(false)}
        />
      )}

      {/* Training panel */}
      {showTraining && (
        <TrainingPanel
          troops={troops}
          trainingInterval={trainingInterval}
          nextTrainingAt={nextTrainingAt}
          healingQueue={healingQueue}
          upgrades={upgrades}
          onUpgradeTraining={() => onUpgradeStructure("trainingSpeed")}
          onClose={() => setShowTraining(false)}
        />
      )}

      {/* Upgrade panel */}
      {showUpgrade && (
        <UpgradePanel
          upgrades={upgrades}
          myPlayer={myPlayer}
          onUpgrade={onUpgradeStructure}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {/* Teleport panel */}
      {showTeleport && (
        <TeleportPanel
          teleports={teleports}
          onUseTeleport={handleUseTeleport}
          onNavigate={navigateTo}
          onClose={() => setShowTeleport(false)}
          marchingArmies={marchingArmies}
          username={username}
        />
      )}

      {/* Disconnected Territory Tiles Panel */}
      {showDisconnectedTiles && myClan && (
        <div
          data-ocid="territory.panel"
          style={{
            position: "fixed",
            top: 80,
            left: 12,
            zIndex: 150,
            background: "rgba(8,4,2,0.96)",
            border:
              disconnectedTiles.length > 0
                ? "2px solid rgba(255,80,0,0.7)"
                : "2px solid rgba(50,200,80,0.5)",
            borderRadius: 10,
            width: 240,
            maxHeight: 340,
            overflowY: "auto",
            boxShadow:
              disconnectedTiles.length > 0
                ? "0 0 18px rgba(255,80,0,0.3)"
                : "0 0 12px rgba(50,200,80,0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px 6px",
              borderBottom:
                disconnectedTiles.length > 0
                  ? "1px solid rgba(255,80,0,0.3)"
                  : "1px solid rgba(50,200,80,0.2)",
            }}
          >
            <span
              style={{
                color: disconnectedTiles.length > 0 ? "#ff8844" : "#55ee88",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {disconnectedTiles.length > 0
                ? "⚠️ Disconnected Tiles"
                : "✅ Territory Status"}
            </span>
            <button
              type="button"
              onClick={() => setShowDisconnectedTiles(false)}
              style={{
                background: "none",
                border: "none",
                color: "#777",
                cursor: "pointer",
                fontSize: 15,
                lineHeight: 1,
              }}
              data-ocid="territory.close_button"
            >
              ×
            </button>
          </div>
          <div style={{ padding: "6px 8px" }}>
            {disconnectedTiles.length === 0 ? (
              <div
                style={{ color: "#55ee88", fontSize: 11, padding: "6px 2px" }}
              >
                ✅ All tiles are connected to HQ!
              </div>
            ) : (
              <>
                <div style={{ color: "#aaa", fontSize: 10, marginBottom: 6 }}>
                  {disconnectedTiles.length} tile
                  {disconnectedTiles.length !== 1 ? "s" : ""} disconnected from
                  HQ. Reconnect by claiming tiles between them and your HQ
                  territory.
                </div>
                {disconnectedTiles.map((tile, idx) => (
                  <div
                    key={`${tile.cellX}-${tile.cellY}`}
                    data-ocid={`territory.item.${idx + 1}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 2px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      gap: 4,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: "#ff8844",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        ⚠ Tile ({tile.cellX}, {tile.cellY})
                      </span>
                      <div style={{ color: "#666", fontSize: 9 }}>
                        Map ~({tile.cellX * 20}, {tile.cellY * 20})
                      </div>
                      <div
                        style={{ color: "#ffaa44", fontSize: 9, marginTop: 2 }}
                      >
                        {tile.reconnectDir
                          ? `Claim ${tile.reconnectDir} to reconnect`
                          : "↗ Claim toward HQ"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigateTo(tile.cellX * 20, tile.cellY * 20)
                      }
                      style={{
                        background: "rgba(255,80,0,0.2)",
                        border: "1px solid rgba(255,80,0,0.5)",
                        borderRadius: 5,
                        color: "#ff9944",
                        fontSize: 10,
                        padding: "3px 7px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                      data-ocid="territory.button"
                    >
                      🎯 Go To
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Clan HQ Panel */}
      {showHQPanel && hqPanelClan && (
        <>
          <ClanHQPanel
            clan={hqPanelClan}
            username={username}
            onClose={() => {
              setShowHQPanel(false);
              setHQPanelClanId(null);
            }}
            onTeleportHQ={teleportClanHQ}
            onSpendPoints={spendClanPoints}
            onDonateGold={donateGoldForHQPoints}
            myGold={myPlayer?.gold || 0}
            onChangeMemberRank={changeMemberRank}
            onKickMember={onKickMember}
            hasClanDragon={hasClanDragon}
            hqShieldActive={myPlayer?.shieldActive}
            dragonModeActive={dragonModeActive}
            onToggleDragonMode={toggleDragonMode}
            onLaunchAtomBomb={onLaunchAtomBomb}
            allPlayers={players
              .filter((p) => !p.username.startsWith("Unspeaken_"))
              .map((p) => ({ id: p.id, username: p.username }))}
            clans={clans}
          />
          {/* Feature 8: Show reinforce button for allied HQ (not own clan's HQ) */}
          {myClan &&
            hqPanelClan.id !== myClan.id &&
            hqPanelClan.memberUsernames.some(
              (m) =>
                myClan.memberUsernames.includes(m) ||
                clans
                  .find((c) => c.id === myClan.id)
                  ?.memberUsernames.includes(m),
            ) &&
            (hqPanelClan.hqHp ?? 0) > 0 && (
              <div
                style={{
                  position: "fixed",
                  bottom: 120,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 200,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setReinforceClanId(hqPanelClan.id);
                    setShowReinforceHQ(true);
                    setShowHQPanel(false);
                    setHQPanelClanId(null);
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    fontWeight: "bold",
                    fontSize: 13,
                    background: "rgba(30,120,60,0.9)",
                    color: "#44ff88",
                    border: "2px solid #44cc88",
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(40,200,100,0.4)",
                  }}
                  data-ocid="reinforce.open_modal_button"
                >
                  🛡 Reinforce {hqPanelClan.name} HQ
                </button>
              </div>
            )}
          {/* Show Reinforce button for any allied clan HQ that's in same server */}
          {myClan &&
            hqPanelClan.id !== myClan.id &&
            hqPanelClan.serverId === serverId &&
            hqPanelClan.memberUsernames.includes(username) === false &&
            (hqPanelClan.hqHp ?? 0) > 0 && (
              <div
                style={{
                  position: "fixed",
                  bottom: 80,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 200,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setReinforceClanId(hqPanelClan.id);
                    setShowReinforceHQ(true);
                    setShowHQPanel(false);
                    setHQPanelClanId(null);
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    fontWeight: "bold",
                    fontSize: 13,
                    background: "rgba(30,100,60,0.9)",
                    color: "#44ff88",
                    border: "2px solid #44cc88",
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(40,200,100,0.4)",
                  }}
                  data-ocid="reinforce.open_modal_button"
                >
                  🛡 Send Reinforcements to {hqPanelClan.name}
                </button>
              </div>
            )}
        </>
      )}

      {/* Hacker: Attacker progress bar */}
      {hackerIsHacking && hackerStartTime && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-3 rounded-xl text-center"
          style={{
            background: "rgba(0,15,30,0.95)",
            border: "2px solid rgba(0,200,255,0.6)",
            minWidth: 240,
            boxShadow: "0 0 20px rgba(0,180,255,0.4)",
          }}
          data-ocid="hacker.loading_state"
        >
          <div className="text-xs font-bold mb-1" style={{ color: "#00ccff" }}>
            💻 Hacking shield... {(() => {
              const elapsed = Date.now() - hackerStartTime;
              const remaining = Math.max(0, 180 - Math.floor(elapsed / 1000));
              const mm = Math.floor(remaining / 60);
              const ss = remaining % 60;
              return `${mm}:${ss.toString().padStart(2, "0")}`;
            })()} remaining
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 6, background: "rgba(0,80,120,0.5)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((Date.now() - hackerStartTime) / 180000) * 100)}%`,
                background: "linear-gradient(90deg, #0088cc, #00eeff)",
                boxShadow: "0 0 6px #00ccff",
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setHackerIsHacking(false);
              setHackerTargetId(null);
              setHackerStartTime(null);
              toast("💻 Hack cancelled.");
            }}
            className="mt-2 text-xs px-3 py-1 rounded"
            style={{
              background: "rgba(200,50,50,0.2)",
              border: "1px solid rgba(200,50,50,0.4)",
              color: "#ff8888",
            }}
            data-ocid="hacker.cancel_button"
          >
            Cancel Hack
          </button>
        </div>
      )}

      {/* Hacker: Defender warning banner */}
      {myShieldHackedUntil && Date.now() < myShieldHackedUntil && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-xl text-center"
          style={{
            background: "rgba(30,0,0,0.95)",
            border: "2px solid rgba(255,50,50,0.8)",
            minWidth: 260,
            animation: "pulse 1s infinite",
            boxShadow: "0 0 20px rgba(255,0,0,0.5)",
          }}
          data-ocid="hacker.error_state"
        >
          <div className="text-sm font-bold" style={{ color: "#ff4444" }}>
            🔓 SHIELD HACKED — restores in {(() => {
              const remaining = Math.max(
                0,
                Math.ceil((myShieldHackedUntil - Date.now()) / 1000),
              );
              const mm = Math.floor(remaining / 60);
              const ss = remaining % 60;
              return `${mm}:${ss.toString().padStart(2, "0")}`;
            })()}
          </div>
        </div>
      )}

      {saveMsg && (
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-6 py-3 rounded-lg font-bold text-sm"
          style={{
            background: "rgba(60,40,10,0.95)",
            border: "1px solid #D4A96A",
            color: "#D4A96A",
          }}
        >
          {saveMsg}
        </div>
      )}

      {/* Tapped player popup */}
      {tappedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="rounded-xl p-5 w-72"
            style={{
              background: "#1a0f05",
              border: "2px solid rgba(180,140,60,0.4)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={{
                  background: "rgba(180,140,60,0.15)",
                  border: "1px solid rgba(180,140,60,0.3)",
                  color: "#D4A96A",
                }}
              >
                {tappedPlayer.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "#D4A96A" }}>
                  {tappedPlayer.username}
                </div>
                {(() => {
                  const pc = clans.find((c) =>
                    c.memberUsernames.includes(tappedPlayer.username),
                  );
                  return pc ? (
                    <div className="text-xs" style={{ color: pc.color }}>
                      [{pc.name}]
                    </div>
                  ) : (
                    <div className="text-xs" style={{ color: "#888" }}>
                      No Clan
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="text-xs mb-3 space-y-1" style={{ color: "#aaa" }}>
              <div>
                HP: {tappedPlayer.hp.toLocaleString()} /{" "}
                {(tappedPlayer.maxHp || 100).toLocaleString()}
              </div>
              {tappedPlayer.troops && (
                <div>
                  \u2694\uFE0F {tappedPlayer.troops.soldiers.toLocaleString()} |
                  \uD83D\uDEE1\uFE0F{" "}
                  {tappedPlayer.troops.tanks.toLocaleString()} | \u2708\uFE0F{" "}
                  {tappedPlayer.troops.jets.toLocaleString()}
                </div>
              )}
            </div>
            {myClan &&
              !clans.find((c) =>
                c.memberUsernames.includes(tappedPlayer.username),
              ) && (
                <button
                  type="button"
                  onClick={() => {
                    onSendClanInvite(tappedPlayer.username);
                    toast.success(
                      `Clan invite sent to ${tappedPlayer.username}!`,
                    );
                    setTappedPlayer(null);
                  }}
                  className="w-full py-2 rounded-lg text-sm font-bold mb-2"
                  style={{
                    background: `${myClan.color}22`,
                    border: `1px solid ${myClan.color}55`,
                    color: myClan.color,
                  }}
                  data-ocid="player.button"
                >
                  \uD83D\uDC65 Invite to Clan
                </button>
              )}
            <button
              type="button"
              onClick={() => {
                setAidWood(0);
                setAidStone(0);
                setAidFood(0);
                setAidSoldiers(0);
                setShowSendAid(true);
              }}
              className="w-full py-2 rounded-lg text-sm font-bold mb-2"
              style={{
                background: "rgba(60,120,60,0.25)",
                border: "1px solid rgba(100,200,100,0.4)",
                color: "#88ee88",
              }}
              data-ocid="player.button"
            >
              ð¦ Send Aid
            </button>
            {/* Hack Shield button - only for enemies with shields when we own a hacker */}
            {hasHacker &&
              !hackerIsHacking &&
              tappedPlayer.id !== myPlayer?.id &&
              (tappedPlayer.shieldActive ||
                clans.find((c) =>
                  c.memberUsernames.includes(tappedPlayer.username),
                )?.clanShieldActive) &&
              !(
                tappedPlayer.shieldHackedUntil &&
                Date.now() < tappedPlayer.shieldHackedUntil
              ) &&
              !!(myClan && myClan.leaderUsername === username) && (
                <button
                  type="button"
                  onClick={() => {
                    const targetHasHacker = tappedPlayer.hackerOwned;
                    if (targetHasHacker) {
                      toast.error("🛡 Hack blocked by enemy hacker!", {
                        duration: 5000,
                      });
                      toast("💻 Your hacker blocked a cyber attack!", {
                        duration: 5000,
                      });
                    } else {
                      setHackerIsHacking(true);
                      setHackerTargetId(tappedPlayer.id);
                      setHackerStartTime(Date.now());
                      toast(
                        "💻 Hack started! 3 minutes to breach the shield...",
                        {
                          duration: 5000,
                          style: {
                            background: "#001a22",
                            border: "1px solid #00ccff",
                            color: "#00eeff",
                          },
                        },
                      );
                    }
                    setTappedPlayer(null);
                  }}
                  className="w-full py-2 rounded-lg text-sm font-bold mb-2"
                  style={{
                    background: "rgba(0,80,120,0.35)",
                    border: "1px solid rgba(0,200,255,0.6)",
                    color: "#00ccff",
                  }}
                  data-ocid="player.button"
                >
                  💻 Hack Shield
                </button>
              )}
            <button
              type="button"
              onClick={() => setTappedPlayer(null)}
              className="w-full py-2 rounded-lg text-sm"
              style={{ background: "rgba(255,255,255,0.08)", color: "#888" }}
              data-ocid="player.cancel_button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Send Aid Modal */}
      {showSendAid && tappedPlayer && myPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          data-ocid="send_aid.dialog"
        >
          <div
            className="rounded-xl p-5 w-80"
            style={{
              background: "#0f1a0f",
              border: "2px solid rgba(100,200,100,0.5)",
            }}
          >
            <h3
              className="text-base font-bold mb-1"
              style={{ color: "#88ee88" }}
            >
              ð¦ Send Aid to {tappedPlayer.username}
            </h3>
            <p className="text-xs mb-4" style={{ color: "#778" }}>
              Your resources: ðªµ {myPlayer.resources.wood.toLocaleString()} Â·
              â {myPlayer.resources.stone.toLocaleString()} Â· ð¾{" "}
              {myPlayer.resources.food.toLocaleString()} Â· âï¸{" "}
              {(myPlayer.troops?.soldiers || 0).toLocaleString()} soldiers
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <div
                  className="text-xs font-bold block mb-1"
                  style={{ color: "#a0c8a0" }}
                >
                  ðªµ Wood (max {myPlayer.resources.wood.toLocaleString()})
                </div>
                <input
                  type="number"
                  min={0}
                  max={myPlayer.resources.wood}
                  value={aidWood}
                  onChange={(e) =>
                    setAidWood(
                      Math.max(
                        0,
                        Math.min(
                          myPlayer.resources.wood,
                          Number(e.target.value),
                        ),
                      ),
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(100,200,100,0.3)",
                    color: "#ddd",
                    outline: "none",
                  }}
                  data-ocid="send_aid.input"
                />
              </div>
              <div>
                <div
                  className="text-xs font-bold block mb-1"
                  style={{ color: "#a0c8a0" }}
                >
                  â Stone (max {myPlayer.resources.stone.toLocaleString()})
                </div>
                <input
                  type="number"
                  min={0}
                  max={myPlayer.resources.stone}
                  value={aidStone}
                  onChange={(e) =>
                    setAidStone(
                      Math.max(
                        0,
                        Math.min(
                          myPlayer.resources.stone,
                          Number(e.target.value),
                        ),
                      ),
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(100,200,100,0.3)",
                    color: "#ddd",
                    outline: "none",
                  }}
                  data-ocid="send_aid.input"
                />
              </div>
              <div>
                <div
                  className="text-xs font-bold block mb-1"
                  style={{ color: "#a0c8a0" }}
                >
                  ð¾ Food (max {myPlayer.resources.food.toLocaleString()})
                </div>
                <input
                  type="number"
                  min={0}
                  max={myPlayer.resources.food}
                  value={aidFood}
                  onChange={(e) =>
                    setAidFood(
                      Math.max(
                        0,
                        Math.min(
                          myPlayer.resources.food,
                          Number(e.target.value),
                        ),
                      ),
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(100,200,100,0.3)",
                    color: "#ddd",
                    outline: "none",
                  }}
                  data-ocid="send_aid.input"
                />
              </div>
              <div>
                <div
                  className="text-xs font-bold block mb-1"
                  style={{ color: "#a0c8a0" }}
                >
                  âï¸ Soldiers (max{" "}
                  {(myPlayer.troops?.soldiers || 0).toLocaleString()})
                </div>
                <input
                  type="number"
                  min={0}
                  max={myPlayer.troops?.soldiers || 0}
                  value={aidSoldiers}
                  onChange={(e) =>
                    setAidSoldiers(
                      Math.max(
                        0,
                        Math.min(
                          myPlayer.troops?.soldiers || 0,
                          Number(e.target.value),
                        ),
                      ),
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(100,200,100,0.3)",
                    color: "#ddd",
                    outline: "none",
                  }}
                  data-ocid="send_aid.input"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (
                    aidWood === 0 &&
                    aidStone === 0 &&
                    aidFood === 0 &&
                    aidSoldiers === 0
                  ) {
                    toast.error("Nothing to send!");
                    return;
                  }
                  onSendAid?.(
                    tappedPlayer.username,
                    aidWood,
                    aidStone,
                    aidFood,
                    aidSoldiers,
                  );
                  toast.success(
                    `ð¦ Aid sent to ${tappedPlayer.username}! ${aidSoldiers > 0 ? `${aidSoldiers} soldiers, ` : ""}${aidWood > 0 ? `${aidWood} wood, ` : ""}${aidStone > 0 ? `${aidStone} stone, ` : ""}${aidFood > 0 ? `${aidFood} food` : ""}`.replace(
                      /, $/,
                      "",
                    ),
                  );
                  // Spawn marching army as delivery
                  const MARCH_DURATION = 3 * 60 * 1000; // 3 minutes
                  const marchId = `aid_${Date.now()}_${Math.random()}`;
                  const aidMarch: MarchingArmy = {
                    id: marchId,
                    fromX: myPlayer.posX,
                    fromY: myPlayer.posY,
                    toX: tappedPlayer.posX,
                    toY: tappedPlayer.posY,
                    startTime: Date.now(),
                    duration: MARCH_DURATION,
                    attackerUsername: username,
                    attackerColor: myClan?.color || "#44aa44",
                    targetType: "return",
                    targetLabel: `Aid â ${tappedPlayer.username}`,
                  };
                  setMarchingArmies((prev) => [...prev, aidMarch]);
                  setTimeout(() => {
                    setMarchingArmies((prev) =>
                      prev.filter((m) => m.id !== marchId),
                    );
                    toast.success(
                      `â Aid delivered to ${tappedPlayer.username}!`,
                    );
                  }, MARCH_DURATION);
                  setShowSendAid(false);
                  setTappedPlayer(null);
                }}
                className="flex-1 py-2 rounded-lg font-bold text-sm"
                style={{ background: "rgba(40,120,40,0.8)", color: "white" }}
                data-ocid="send_aid.submit_button"
              >
                Send
              </button>
              <button
                type="button"
                onClick={() => setShowSendAid(false)}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ background: "rgba(255,255,255,0.08)", color: "#aaa" }}
                data-ocid="send_aid.cancel_button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {activeBattle && (
        <BattleWindow
          attackerName={activeBattle.attackerName}
          defenderName={activeBattle.defenderName}
          attackerHp={activeBattle.attackerHp}
          attackerMaxHp={activeBattle.attackerMaxHp}
          defenderHp={activeBattle.defenderHp}
          defenderMaxHp={activeBattle.defenderMaxHp}
          attackerTroops={activeBattle.attackerTroops}
          defenderTroops={activeBattle.defenderTroops}
          onClose={() => setActiveBattle(null)}
        />
      )}
      {activeBattle && <WarAudioPopup onClose={() => {}} />}

      {/* All Attacks Log Panel */}
      {showAttackLog && (
        <AllAttacksPanel
          attacks={attackLog}
          onClose={() => setShowAttackLog(false)}
        />
      )}

      {/* Feature 2: K/D Scoreboard */}
      {showKDScoreboard &&
        (() => {
          const allScorePlayers = [...players];
          if (
            myPlayer &&
            !allScorePlayers.find((p) => p.username === myPlayer.username)
          ) {
            allScorePlayers.push(myPlayer);
          }
          const sorted = [...allScorePlayers]
            .map((p) => ({
              username: p.username,
              kills: p.kills ?? 0,
              deaths: p.deaths ?? 0,
              ratio:
                (p.deaths ?? 0) === 0
                  ? (p.kills ?? 0)
                  : (p.kills ?? 0) / (p.deaths ?? 1),
            }))
            .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
          return (
            <div
              style={{
                position: "fixed",
                top: 80,
                left: 12,
                zIndex: 55,
                minWidth: 260,
                maxWidth: 320,
                background: "rgba(10,8,5,0.95)",
                border: "1px solid rgba(180,100,255,0.55)",
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(120,0,200,0.5)",
                fontFamily: "'Figtree', sans-serif",
                overflow: "hidden",
              }}
              data-ocid="kd_scoreboard.panel"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 12px",
                  background: "rgba(140,60,200,0.18)",
                  borderBottom: "1px solid rgba(180,100,255,0.3)",
                }}
              >
                <span
                  style={{ color: "#cc88ff", fontSize: 13, fontWeight: 700 }}
                >
                  💀 Kill/Death Scoreboard
                </span>
                <button
                  type="button"
                  onClick={() => setShowKDScoreboard(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#888",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                  data-ocid="kd_scoreboard.close_button"
                >
                  ×
                </button>
              </div>
              <div style={{ padding: "4px 0 8px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px 1fr 40px 40px 50px",
                    gap: 4,
                    padding: "3px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    marginBottom: 2,
                  }}
                >
                  <span style={{ color: "#666", fontSize: 9 }}>#</span>
                  <span style={{ color: "#888", fontSize: 9 }}>PLAYER</span>
                  <span
                    style={{
                      color: "#ff8888",
                      fontSize: 9,
                      textAlign: "center",
                    }}
                  >
                    KILLS
                  </span>
                  <span
                    style={{
                      color: "#8888ff",
                      fontSize: 9,
                      textAlign: "center",
                    }}
                  >
                    DEATHS
                  </span>
                  <span
                    style={{
                      color: "#ffdd88",
                      fontSize: 9,
                      textAlign: "center",
                    }}
                  >
                    K/D
                  </span>
                </div>
                {sorted.length === 0 ? (
                  <div
                    style={{
                      color: "#555",
                      fontSize: 11,
                      padding: "8px 12px",
                      textAlign: "center",
                    }}
                    data-ocid="kd_scoreboard.empty_state"
                  >
                    No data yet
                  </div>
                ) : (
                  sorted.slice(0, 15).map((p, i) => {
                    const isMe = p.username === username;
                    const playerClanColor =
                      clans.find((c) => c.memberUsernames.includes(p.username))
                        ?.color || "#888";
                    return (
                      <div
                        key={p.username}
                        data-ocid={`kd_scoreboard.item.${i + 1}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "20px 1fr 40px 40px 50px",
                          gap: 4,
                          padding: "3px 10px",
                          background: isMe
                            ? "rgba(180,100,255,0.08)"
                            : "transparent",
                          borderLeft: isMe
                            ? "2px solid #cc88ff"
                            : "2px solid transparent",
                        }}
                      >
                        <span
                          style={{
                            color:
                              i < 3
                                ? ["#FFD700", "#C0C0C0", "#CD7F32"][i]
                                : "#555",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            color: isMe ? "#fff" : "#ccc",
                            fontSize: 10,
                            fontWeight: isMe ? 700 : 400,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{ color: playerClanColor, marginRight: 3 }}
                          >
                            ●
                          </span>
                          {p.username}
                        </span>
                        <span
                          style={{
                            color: "#ff8888",
                            fontSize: 10,
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          {p.kills}
                        </span>
                        <span
                          style={{
                            color: "#8888ff",
                            fontSize: 10,
                            textAlign: "center",
                          }}
                        >
                          {p.deaths}
                        </span>
                        <span
                          style={{
                            color:
                              p.ratio >= 2
                                ? "#ffdd44"
                                : p.ratio >= 1
                                  ? "#88ee88"
                                  : "#ff6666",
                            fontSize: 10,
                            textAlign: "center",
                            fontWeight: 600,
                          }}
                        >
                          {p.deaths === 0
                            ? p.kills > 0
                              ? "∞"
                              : "-"
                            : p.ratio.toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

      {/* Feature 8: Reinforce HQ dialog */}
      {showReinforceHQ &&
        reinforceClanId &&
        (() => {
          const targetClan = clans.find((c) => c.id === reinforceClanId);
          if (!targetClan || !myPlayer || !targetClan.hqPos) return null;
          const myTroopCount = myPlayer.troops?.soldiers ?? 0;
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.75)" }}
              data-ocid="reinforce.modal"
            >
              <div
                className="rounded-xl p-5 w-72"
                style={{ background: "#050f05", border: "2px solid #44cc88" }}
              >
                <h3
                  className="text-base font-bold mb-1"
                  style={{ color: "#44cc88" }}
                >
                  🛡 Reinforce {targetClan.name} HQ
                </h3>
                <p className="text-xs mb-3" style={{ color: "#888" }}>
                  Send soldiers to reinforce your ally's HQ. You have{" "}
                  {myTroopCount.toLocaleString()} soldiers.
                </p>
                <div className="flex gap-1 mb-2">
                  {[100, 500, 1000, 2000].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setReinforceCount(Math.min(n, myTroopCount))
                      }
                      className="flex-1 py-1 rounded text-xs"
                      style={{
                        background:
                          reinforceCount === n
                            ? "rgba(68,200,136,0.3)"
                            : "rgba(255,255,255,0.07)",
                        color: reinforceCount === n ? "#44cc88" : "#aaa",
                        border:
                          reinforceCount === n
                            ? "1px solid #44cc8866"
                            : "1px solid transparent",
                      }}
                    >
                      {n >= 1000 ? `${n / 1000}k` : n}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={0}
                  max={myTroopCount}
                  value={reinforceCount}
                  onChange={(e) =>
                    setReinforceCount(
                      Math.max(
                        0,
                        Math.min(myTroopCount, Number(e.target.value)),
                      ),
                    )
                  }
                  className="w-full px-2 py-1 rounded text-xs mb-3"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(68,200,136,0.3)",
                    color: "#fff",
                    outline: "none",
                  }}
                  data-ocid="reinforce.input"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !targetClan.hqPos ||
                        reinforceCount <= 0 ||
                        reinforceCount > myTroopCount
                      ) {
                        toast.error("Invalid reinforcement count!");
                        return;
                      }
                      // Deduct troops from sender
                      if (myPlayer) {
                        const newSoldiers = Math.max(
                          0,
                          (myPlayer.troops?.soldiers ?? 0) - reinforceCount,
                        );
                        setLocalTroops((prev) => ({
                          ...prev,
                          soldiers: newSoldiers,
                        }));
                      }
                      // Create a friendly reinforce march
                      const MARCH_DURATION = 3 * 60 * 1000;
                      const reinforceId = `reinforce_${Date.now()}_${Math.random()}`;
                      const reinforceMarch: MarchingArmy = {
                        id: reinforceId,
                        fromX: myPlayer.posX,
                        fromY: myPlayer.posY,
                        toX: targetClan.hqPos!.x,
                        toY: targetClan.hqPos!.y,
                        startTime: Date.now(),
                        duration: MARCH_DURATION,
                        attackerUsername: username,
                        attackerColor: "#44cc88",
                        targetType: "hq",
                        targetLabel: `Reinforce ${targetClan.name}`,
                        unitType: "soldiers",
                        isReturn: false,
                        marchType: "reinforce",
                      };
                      setMarchingArmies((prev) => [...prev, reinforceMarch]);
                      addGlobalMarch(reinforceMarch);
                      toast.success(
                        `🛡 ${reinforceCount.toLocaleString()} soldiers marching to reinforce ${targetClan.name}!`,
                      );
                      // When march arrives, add troops to HQ garrison
                      setTimeout(() => {
                        setMarchingArmies((prev) =>
                          prev.filter((m) => m.id !== reinforceId),
                        );
                        removeGlobalMarch(reinforceId);
                        toast.success(
                          `✅ Reinforcements arrived at ${targetClan.name} HQ!`,
                        );
                      }, MARCH_DURATION);
                      setShowReinforceHQ(false);
                      setReinforceClanId(null);
                    }}
                    className="flex-1 py-2 rounded-lg font-bold text-sm"
                    style={{ background: "rgba(40,140,80,0.8)", color: "#fff" }}
                    data-ocid="reinforce.submit_button"
                  >
                    🛡 Send Reinforcements
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReinforceHQ(false);
                      setReinforceClanId(null);
                    }}
                    className="flex-1 py-2 rounded-lg text-sm"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      color: "#aaa",
                    }}
                    data-ocid="reinforce.cancel_button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Pond Troll popup */}
      {selectedTrollId &&
        (() => {
          const troll = pondTrolls.find((t) => t.id === selectedTrollId);
          if (!troll) return null;
          return (
            <div
              style={{
                position: "fixed",
                bottom: 120,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 55,
                background: "rgba(5,15,5,0.97)",
                border: "2px solid rgba(50,180,80,0.6)",
                borderRadius: 12,
                padding: "14px 18px",
                minWidth: 220,
                color: "#fff",
                boxShadow: "0 0 20px rgba(20,200,60,0.3)",
                textAlign: "center",
              }}
              data-ocid="troll.panel"
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>
                {troll.alive ? "\uD83E\uDDCC" : "\uD83D\uDC80"}
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 14,
                  color: "#88ffaa",
                  marginBottom: 8,
                }}
              >
                {troll.alive ? "Pond Troll" : "DEFEATED"}
              </div>
              {troll.alive ? (
                <>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>
                    HP: {troll.hp.toLocaleString()} /{" "}
                    {troll.maxHp.toLocaleString()}
                  </div>
                  <div
                    style={{
                      background: "#220a00",
                      borderRadius: 4,
                      height: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        width: `${(troll.hp / troll.maxHp) * 100}%`,
                        background:
                          troll.hp > troll.maxHp * 0.5
                            ? "#33cc44"
                            : troll.hp > troll.maxHp * 0.25
                              ? "#ffaa00"
                              : "#ff3300",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const dmg =
                        200 +
                        Math.floor(Math.random() * 300) *
                          Math.max(1, upgrades.attackPower);
                      setPondTrolls((prev) =>
                        prev.map((t) => {
                          if (t.id !== selectedTrollId) return t;
                          const newHp = Math.max(0, t.hp - dmg);
                          if (newHp <= 0) {
                            toast.success(
                              "\uD83E\uDDCC Pond Troll defeated! It will respawn in 10 minutes.",
                            );
                            return {
                              ...t,
                              hp: 0,
                              alive: false,
                              respawnAt: Date.now() + 10 * 60 * 1000,
                            };
                          }
                          toast(
                            `\uD83D\uDDE1 You dealt ${dmg} damage to the Troll!`,
                          );
                          return { ...t, hp: newHp };
                        }),
                      );
                    }}
                    data-ocid="troll.button"
                    style={{
                      padding: "8px 20px",
                      background: "rgba(200,60,20,0.5)",
                      border: "1px solid rgba(255,100,50,0.6)",
                      borderRadius: 8,
                      color: "#ffaa66",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: 13,
                      marginBottom: 6,
                      width: "100%",
                    }}
                  >
                    \u2694\uFE0F Attack Troll
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 11, color: "#ff8888" }}>
                  Respawns in{" "}
                  {troll.respawnAt
                    ? Math.ceil((troll.respawnAt - Date.now()) / 60000)
                    : 10}{" "}
                  min
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedTrollId(null)}
                data-ocid="troll.close_button"
                style={{
                  marginTop: 4,
                  padding: "4px 14px",
                  background: "rgba(40,40,40,0.5)",
                  border: "1px solid rgba(100,100,100,0.4)",
                  borderRadius: 6,
                  color: "#888",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Close
              </button>
            </div>
          );
        })()}
    </div>
  );
}
