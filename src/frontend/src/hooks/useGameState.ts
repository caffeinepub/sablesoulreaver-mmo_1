import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AttackFlash,
  AttackNotification,
  BossState,
  ChatMessage,
  ClanUpgrades,
  GamePlayer,
  GameSave,
  HealingEntry,
  LocalClan,
  ResourceField,
  SpyPlane,
  TeleportCharge,
  TerritoryCell,
  TrainingEntry,
  TroopCounts,
  UpgradeState,
} from "../types/game";
import { WORLD_SIZE } from "../types/game";
import type { AtomBomb, DragonNPC, NPCBase } from "../types/game";
import { useActor } from "./useActor";

const BOSS_X = 50000;
const BOSS_Y = 50000;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const NPC_MEMBER_NAMES = [
  "Unspeaken_Vex",
  "Unspeaken_Morg",
  "Unspeaken_Rath",
  "Unspeaken_Dusk",
  "Unspeaken_Zahl",
  "Unspeaken_Oryn",
  "Unspeaken_Sev",
  "Unspeaken_Krul",
  "Unspeaken_Nem",
  "Unspeaken_Bane",
  "Unspeaken_Grix",
  "Unspeaken_Torr",
  "Unspeaken_Wren",
  "Unspeaken_Fex",
  "Unspeaken_Loch",
  "Unspeaken_Quin",
  "Unspeaken_Drex",
  "Unspeaken_Yar",
  "Unspeaken_Crev",
  "Unspeaken_Nox",
];

function generateNPCBases(): NPCBase[] {
  const rng = seededRandom(999888777);
  const bases: NPCBase[] = [];
  for (let i = 0; i < 100; i++) {
    let x: number;
    let y: number;
    do {
      x = 2000 + rng() * (WORLD_SIZE - 4000);
      y = 2000 + rng() * (WORLD_SIZE - 4000);
    } while (Math.abs(x - 50000) < 5000 && Math.abs(y - 50000) < 5000);
    bases.push({
      id: `npc_${i}`,
      memberName: NPC_MEMBER_NAMES[i % 20],
      posX: x,
      posY: y,
      hp: 8000,
      maxHp: 8000,
      wallHp: 8000,
      maxWallHp: 8000,
      troops: 10000,
    });
  }
  return bases;
}

const DRAGON_NAMES = [
  "Ignarax",
  "Velthorn",
  "Scaldrix",
  "Morveyn",
  "Draugoth",
  "Zyrathis",
  "Emberclaw",
  "Noctivex",
  "Pyroxis",
  "Sablewing",
  "Thornfang",
  "Cinderveil",
  "Grimscale",
  "Ashvorn",
  "Wraithfire",
];

function generateDragons(): DragonNPC[] {
  const rng = seededRandom(777666555);
  const dragons: DragonNPC[] = [];
  for (let i = 0; i < 15; i++) {
    let x: number;
    let y: number;
    do {
      x = 2000 + rng() * (WORLD_SIZE - 4000);
      y = 2000 + rng() * (WORLD_SIZE - 4000);
    } while (Math.abs(x - 50000) < 8000 && Math.abs(y - 50000) < 8000);
    dragons.push({
      id: `dragon_${i}`,
      name: DRAGON_NAMES[i],
      posX: x,
      posY: y,
      hp: 560000,
      maxHp: 560000,
      armorHp: 400000,
      maxArmorHp: 400000,
      isAlive: true,
    });
  }
  return dragons;
}
function generateResourceFields(serverId: number): ResourceField[] {
  const rng = seededRandom(serverId * 12345);
  const types: ("wood" | "stone" | "food")[] = ["wood", "stone", "food"];
  const fields: ResourceField[] = [];
  for (let i = 0; i < 24; i++) {
    fields.push({
      id: `rf_${serverId}_${i}`,
      type: types[i % 3],
      x: 500 + rng() * (WORLD_SIZE - 1000),
      y: 500 + rng() * (WORLD_SIZE - 1000),
      guardStrength: 200 + Math.floor(rng() * 800),
      occupyingTroops: null,
    });
  }
  // Add 8 gold resource fields per server with 20000 guards
  const goldRng = seededRandom(serverId * 99991 + 7777);
  for (let i = 0; i < 8; i++) {
    fields.push({
      id: `rf_gold_${serverId}_${i}`,
      type: "gold" as const,
      x: 1000 + goldRng() * (WORLD_SIZE - 2000),
      y: 1000 + goldRng() * (WORLD_SIZE - 2000),
      guardStrength: 20000,
      occupyingTroops: null,
    });
  }
  return fields;
}

function storageKey(key: string, serverId: number) {
  return `ssmmo_${key}_server_${serverId}`;
}

const SABLE_TROOPS: TroopCounts = {
  soldiers: 100000,
  tanks: 100000,
  jets: 100000,
};
const SABLE_UPGRADES: UpgradeState = {
  baseHp: 10,
  wallHp: 10,
  trainingSpeed: 10,
  troopCap: 10,
  attackPower: 10,
};

export type CaptureResult =
  | "guards_remaining"
  | "guards_defeated"
  | "occupied_by_enemy"
  | "troops_defeated"
  | "captured";

export function useGameState() {
  const { actor } = useActor();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<"username" | "server-select" | "game">(
    "username",
  );
  const [username, setUsernameState] = useState(
    () => localStorage.getItem("ssmmo_username") || "",
  );
  const [serverId, setServerId] = useState(1);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [clans, setClans] = useState<LocalClan[]>([]);
  const [territory, setTerritory] = useState<TerritoryCell[]>([]);
  const [resources, setResources] = useState<ResourceField[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [attackNotifications, setAttackNotifications] = useState<
    AttackNotification[]
  >([]);
  const [myPlayer, setMyPlayer] = useState<GamePlayer | null>(null);
  const [serverInfos, setServerInfos] = useState<
    {
      name: string;
      playerCount: number;
      isOnline: boolean;
      players: string[];
    }[]
  >([]);

  // ── New feature state ───────────────────────────────────────────────────────
  const [myShieldActive, setMyShieldActive] = useState(false);
  const [shieldCooldownUntil, setShieldCooldownUntil] = useState(0);
  const [bossNPC, setBossNPC] = useState<BossState | null>(null);
  const [attackFlashes, setAttackFlashes] = useState<AttackFlash[]>([]);
  const [npcBases, setNpcBases] = useState<NPCBase[]>(() => generateNPCBases());
  const [dragons, setDragons] = useState<DragonNPC[]>(() => generateDragons());
  const [atomBombs, setAtomBombs] = useState<AtomBomb[]>([]);
  const [activeSpyPlanes, setActiveSpyPlanes] = useState<SpyPlane[]>([]);
  const [healingQueue, setHealingQueue] = useState<HealingEntry[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeState>({
    baseHp: 1,
    wallHp: 1,
    trainingSpeed: 1,
    troopCap: 1,
    attackPower: 1,
  });
  const [teleports, setTeleports] = useState<TeleportCharge[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({ id: i, cooldownUntil: 0 })),
  );
  const [lastTrainingAt, setLastTrainingAt] = useState(() => Date.now());

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const harvestCooldownRef = useRef<Record<string, number>>({});
  const upgradesRef = useRef<UpgradeState>(upgrades);
  const serverIdRef = useRef(serverId);
  const usernameRef = useRef(username);

  // ── Clan invite state ─────────────────────────────────────────────────────
  interface ClanInvite {
    id: string;
    fromUsername: string;
    clanId: string;
    clanName: string;
    clanColor: string;
    timestamp: number;
  }
  const [clanInvites, setClanInvites] = useState<ClanInvite[]>([]);
  const mountTimeRef = useRef(Date.now());
  const processedInviteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    upgradesRef.current = upgrades;
  }, [upgrades]);

  useEffect(() => {
    serverIdRef.current = serverId;
  }, [serverId]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const trainingInterval = Math.max(
    30000,
    300000 / Math.max(1, upgrades.trainingSpeed),
  );
  const trainingQueue: TrainingEntry[] =
    screen === "game"
      ? [
          {
            type: "soldiers" as const,
            count: 100,
            completesAt: lastTrainingAt + trainingInterval,
          },
        ]
      : [];

  // ── Storage helpers ─────────────────────────────────────────────────────────
  const loadLocalState = useCallback((sid: number) => {
    const savedClans = localStorage.getItem(storageKey("clans", sid));
    const savedTerritory = localStorage.getItem(storageKey("territory", sid));
    const savedResources = localStorage.getItem(storageKey("resources", sid));
    const savedChat = localStorage.getItem(storageKey("chat", sid));

    if (savedClans) setClans(JSON.parse(savedClans));
    if (savedTerritory) setTerritory(JSON.parse(savedTerritory));

    if (savedResources) {
      setResources(JSON.parse(savedResources));
    } else {
      const defaults = generateResourceFields(sid);
      setResources(defaults);
      localStorage.setItem(
        storageKey("resources", sid),
        JSON.stringify(defaults),
      );
    }

    if (savedChat) setChatMessages(JSON.parse(savedChat));
  }, []);

  const saveLocalState = useCallback(
    (
      sid: number,
      cl: LocalClan[],
      terr: TerritoryCell[],
      res: ResourceField[],
    ) => {
      localStorage.setItem(storageKey("clans", sid), JSON.stringify(cl));
      localStorage.setItem(storageKey("territory", sid), JSON.stringify(terr));
      localStorage.setItem(storageKey("resources", sid), JSON.stringify(res));
    },
    [],
  );

  // ── Server info ─────────────────────────────────────────────────────────────
  const fetchServerInfos = useCallback(async () => {
    if (!actor) return;
    try {
      const [s1, s2, s3, p1, p2, p3] = await Promise.all([
        actor.getServerInfo(1n),
        actor.getServerInfo(2n),
        actor.getServerInfo(3n),
        actor.getPlayersOnServer(1n),
        actor.getPlayersOnServer(2n),
        actor.getPlayersOnServer(3n),
      ]);
      setServerInfos([
        {
          name: "Shadowwood",
          playerCount: Number(s1.playerCount),
          isOnline: s1.isOnline,
          players: p1.map((p) => p.username),
        },
        {
          name: "Ironveil",
          playerCount: Number(s2.playerCount),
          isOnline: s2.isOnline,
          players: p2.map((p) => p.username),
        },
        {
          name: "Crimsonmoor",
          playerCount: Number(s3.playerCount),
          isOnline: s3.isOnline,
          players: p3.map((p) => p.username),
        },
      ]);
    } catch {
      setServerInfos([
        { name: "Shadowwood", playerCount: 0, isOnline: true, players: [] },
        { name: "Ironveil", playerCount: 0, isOnline: true, players: [] },
        { name: "Crimsonmoor", playerCount: 0, isOnline: true, players: [] },
      ]);
    }
  }, [actor]);

  // ── Player polling ──────────────────────────────────────────────────────────
  const pollPlayers = useCallback(
    async (sid: number) => {
      if (!actor) return;
      try {
        const backendPlayers = await actor.getPlayersOnServer(BigInt(sid));
        const converted: GamePlayer[] = backendPlayers.map((p) => ({
          id: p.id.toString(),
          username: p.username,
          serverId: Number(p.serverId),
          posX: p.posX,
          posY: p.posY,
          hp: Number(p.hp),
          maxHp: Number(p.baseHp) || 100,
          maxBaseHp: Number(p.baseHp) || 100,
          wallHp: Number(p.wallHp),
          maxWallHp: Math.max(Number(p.wallHp), 1000),
          level: Number(p.level),
          upgradeLevel: Number(p.upgradeLevel),
          shieldActive: p.shieldActive,
          resources: {
            wood: Number(p.resources.wood),
            stone: Number(p.resources.stone),
            food: Number(p.resources.food),
          },
          troops: {
            soldiers: Number(p.troops.soldiers),
            tanks: Number(p.troops.tanks),
            jets: Number(p.troops.jets),
          },
        }));
        setPlayers(converted);
      } catch {
        // silent fail
      }
    },
    [actor],
  );

  // ── Join server ─────────────────────────────────────────────────────────────
  const setUsername = useCallback((u: string) => {
    setUsernameState(u);
    localStorage.setItem("ssmmo_username", u);
  }, []);

  const joinServer = useCallback(
    async (sid: number) => {
      if (!actor) return;
      const centerX = WORLD_SIZE / 2;
      const centerY = WORLD_SIZE / 2;
      const savedX =
        Number.parseFloat(localStorage.getItem(`ssmmo_posX_${sid}`) || "0") ||
        centerX - 2000 + Math.random() * 4000;
      const savedY =
        Number.parseFloat(localStorage.getItem(`ssmmo_posY_${sid}`) || "0") ||
        centerY - 2000 + Math.random() * 4000;
      localStorage.setItem(`ssmmo_posX_${sid}`, String(savedX));
      localStorage.setItem(`ssmmo_posY_${sid}`, String(savedY));
      try {
        await actor.registerOrUpdatePlayer(
          username,
          BigInt(sid),
          savedX,
          savedY,
        );
      } catch {
        // proceed anyway
      }

      const localClanId =
        localStorage.getItem(`ssmmo_myClanId_${sid}`) || undefined;
      const isSable = username === "SableSoulreaver";

      const savedGold =
        Number.parseInt(localStorage.getItem(`ssmmo_gold_${sid}`) || "50000") ||
        50000;
      const savedBasePhoto =
        localStorage.getItem(`ssmmo_basephoto_${username}`) || undefined;

      const basePlayer: GamePlayer = {
        id: "local",
        username,
        serverId: sid,
        posX: savedX,
        posY: savedY,
        hp: isSable
          ? 90000
          : Number.parseInt(
              localStorage.getItem(`ssmmo_myHp_${sid}`) || "8000",
            ),
        maxHp: isSable ? 90000 : 8000,
        maxBaseHp: isSable ? 90000 : 8000,
        wallHp: isSable ? 60000 : 8000,
        maxWallHp: isSable ? 60000 : 8000,
        level: isSable ? 1000 : 1,
        clanId: localClanId,
        resources: isSable
          ? { wood: 999999, stone: 999999, food: 999999 }
          : { wood: 100, stone: 100, food: 100 },
        gold: isSable ? 999999999999 : savedGold,
        troops: isSable
          ? SABLE_TROOPS
          : { soldiers: 10000, tanks: 10000, jets: 10000 },
        upgradeLevel: isSable ? 10 : 1,
        shieldActive: isSable,
        basePhotoUrl: savedBasePhoto,
        kills: 0,
        deaths: 0,
      };

      // One-time troop boost: ensure all players have at least 10,000 of each unit
      const minTroops = 10000;
      if (!isSable && basePlayer.troops) {
        if (basePlayer.troops.soldiers < minTroops)
          basePlayer.troops.soldiers = minTroops;
        if (basePlayer.troops.tanks < minTroops)
          basePlayer.troops.tanks = minTroops;
        if (basePlayer.troops.jets < minTroops)
          basePlayer.troops.jets = minTroops;
      }
      // One-time gold boost: ensure all players have at least 50,000 gold
      if (!isSable && (basePlayer.gold || 0) < 50000) {
        basePlayer.gold = 50000;
        localStorage.setItem(`ssmmo_gold_${sid}`, "50000");
      }
      setMyPlayer(basePlayer);
      if (isSable) {
        setMyShieldActive(true);
        setUpgrades(SABLE_UPGRADES);
      }
      setServerId(sid);
      loadLocalState(sid);

      // Fetch boss NPC
      try {
        const boss = await actor.getBossNPC(BigInt(sid));
        setBossNPC({
          baseHp: Number(boss.baseHp),
          wallHp: Number(boss.wallHp),
          maxBaseHp: 50000,
          maxWallHp: 30000,
          shieldCooldownUntil: Number(boss.shieldCooldownUntil) / 1_000_000,
          defeated: boss.defeated,
        });
      } catch {
        setBossNPC({
          baseHp: 50000,
          wallHp: 30000,
          maxBaseHp: 50000,
          maxWallHp: 30000,
          shieldCooldownUntil: 0,
          defeated: false,
        });
      }

      setScreen("game");
    },
    [actor, username, loadLocalState],
  );

  // ── Polling loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    pollPlayers(serverId);
    pollRef.current = setInterval(() => pollPlayers(serverId), 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [screen, serverId, pollPlayers]);

  // ── Pending Aid check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game" || !username) return;
    const interval = setInterval(() => {
      const key = `ssmmo_pending_aid_${username}`;
      const pending = JSON.parse(localStorage.getItem(key) || "[]");
      if (pending.length === 0) return;
      localStorage.removeItem(key);
      let totalWood = 0;
      let totalStone = 0;
      let totalFood = 0;
      let totalSoldiers = 0;
      for (const pkg of pending) {
        totalWood += pkg.wood || 0;
        totalStone += pkg.stone || 0;
        totalFood += pkg.food || 0;
        totalSoldiers += pkg.soldiers || 0;
      }
      setMyPlayer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          resources: {
            wood: prev.resources.wood + totalWood,
            stone: prev.resources.stone + totalStone,
            food: prev.resources.food + totalFood,
          },
          troops: prev.troops
            ? { ...prev.troops, soldiers: prev.troops.soldiers + totalSoldiers }
            : prev.troops,
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [screen, username]);

  // ── Training loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const interval = setInterval(() => {
      setMyPlayer((prev) => {
        if (!prev) return prev;
        const troops = prev.troops || { soldiers: 0, tanks: 0, jets: 0 };
        const cap = upgradesRef.current.troopCap * 10000;
        const newSoldiers = Math.min(cap, troops.soldiers + 100);
        return { ...prev, troops: { ...troops, soldiers: newSoldiers } };
      });
      setLastTrainingAt(Date.now());
    }, trainingInterval);
    return () => clearInterval(interval);
  }, [screen, trainingInterval]);

  // ── Healing loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const interval = setInterval(() => {
      const now = Date.now();
      setHealingQueue((prev) => {
        const completed = prev.filter((h) => h.completesAt <= now);
        const remaining = prev.filter((h) => h.completesAt > now);
        if (completed.length > 0) {
          const totalHealed = completed.reduce((sum, h) => sum + h.troops, 0);
          setMyPlayer((mp) => {
            if (!mp) return mp;
            const t = mp.troops || { soldiers: 0, tanks: 0, jets: 0 };
            return {
              ...mp,
              troops: { ...t, soldiers: t.soldiers + totalHealed },
            };
          });
        }
        return remaining;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [screen]);

  // ── Resource gain tick (garrison) ────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const interval = setInterval(() => {
      const sid = serverIdRef.current;
      const uname = usernameRef.current;
      setResources((prevRes) => {
        const myFields = prevRes.filter(
          (r) => r.occupyingTroops?.username === uname,
        );
        if (myFields.length === 0) return prevRes;
        // Grant resources to player
        setMyPlayer((mp) => {
          if (!mp) return mp;
          let wood = mp.resources.wood;
          let stone = mp.resources.stone;
          let food = mp.resources.food;
          for (const f of myFields) {
            if (f.type === "wood") wood += 25;
            else if (f.type === "stone") stone += 25;
            else food += 25;
          }
          return { ...mp, resources: { wood, stone, food } };
        });
        return prevRes;
      });
      // Save resources periodically
      setResources((res) => {
        localStorage.setItem(storageKey("resources", sid), JSON.stringify(res));
        return res;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [screen]);

  // ── Clan shield expiry check ────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setClans((prev) => {
        let changed = false;
        const next = prev.map((c) => {
          if (
            c.clanShieldActive &&
            c.clanShieldActivatedAt &&
            now - c.clanShieldActivatedAt >= 24 * 60 * 60 * 1000
          ) {
            changed = true;
            return {
              ...c,
              clanShieldActive: false,
              clanShieldCooldownUntil:
                c.clanShieldActivatedAt +
                24 * 60 * 60 * 1000 +
                48 * 60 * 60 * 1000,
            };
          }
          return c;
        });
        if (changed) {
          localStorage.setItem(
            storageKey("clans", serverIdRef.current),
            JSON.stringify(next),
          );
        }
        return changed ? next : prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const sendChat = useCallback(
    async (content: string) => {
      if (!actor) return;
      const msg: ChatMessage = {
        id: `${Date.now()}_${Math.random()}`,
        username,
        content,
        timestamp: Date.now(),
        serverId,
      };
      try {
        await actor.sendChatMessage(BigInt(serverId), username, content);
      } catch {
        // store locally anyway
      }
      setChatMessages((prev) => {
        const next = [...prev, msg].slice(-50);
        localStorage.setItem(
          storageKey("chat", serverId),
          JSON.stringify(next),
        );
        return next;
      });
    },
    [actor, username, serverId],
  );

  // ── Attack notification ──────────────────────────────────────────────────────
  const triggerAttack = useCallback(
    async (
      _targetUsername: string,
      targetId: string,
      targetType: "base" | "resource",
      damage: number,
    ) => {
      const myClan = clans.find((c) => c.memberUsernames.includes(username));
      const clanName = myClan?.name || "No Clan";
      const notif: AttackNotification = {
        id: `${Date.now()}_${Math.random()}`,
        message: `⚔️ ${clanName} / ${username} is attacking!`,
        timestamp: Date.now(),
      };
      setAttackNotifications((prev) => [...prev, notif]);
      setTimeout(() => {
        setAttackNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      }, 2000);
      if (actor) {
        try {
          await actor.recordAttack(
            username,
            clanName,
            BigInt(targetId.replace(/\D/g, "").slice(0, 10) || "1"),
            targetType,
            BigInt(serverId),
            BigInt(damage),
          );
        } catch {
          // ignore
        }
      }
    },
    [actor, clans, username, serverId],
  );

  // ── Clan territory ───────────────────────────────────────────────────────────
  const claimTerritory = useCallback(
    (cellX: number, cellY: number) => {
      const myClan = clans.find((c) => c.memberUsernames.includes(username));
      if (!myClan) return;
      setTerritory((prev) => {
        const filtered = prev.filter(
          (t) => !(t.cellX === cellX && t.cellY === cellY),
        );
        const next = [...filtered, { cellX, cellY, clanId: myClan.id }];
        localStorage.setItem(
          storageKey("territory", serverId),
          JSON.stringify(next),
        );
        return next;
      });
      if (actor) {
        try {
          actor.claimTerritory(
            BigInt(serverId),
            BigInt(cellX),
            BigInt(cellY),
            BigInt(myClan.id.replace(/\D/g, "").slice(0, 10) || "1"),
          );
        } catch {
          // ignore
        }
      }
    },
    [actor, clans, username, serverId],
  );

  // ── Claim Nearby Tiles ──────────────────────────────────────────────────────
  const [claimTileCooldown, setClaimTileCooldown] = useState<number>(0);

  const claimNearbyTiles = useCallback(():
    | "no_clan"
    | "cooldown"
    | "claimed" => {
    const myClan = clans.find((c) => c.memberUsernames.includes(username));
    if (!myClan) return "no_clan";
    const now = Date.now();
    if (claimTileCooldown > now) return "cooldown";

    // Helper: BFS to find all clan tiles reachable from the HQ cell
    const getHQConnectedTiles = (
      allTiles: TerritoryCell[],
      clanId: string,
      hqCellX: number,
      hqCellY: number,
    ): Set<string> => {
      const ownedMap = new Set<string>(
        allTiles
          .filter((t) => t.clanId === clanId)
          .map((t) => `${t.cellX},${t.cellY}`),
      );
      const startKey = `${hqCellX},${hqCellY}`;
      if (!ownedMap.has(startKey)) return new Set();
      const visited = new Set<string>();
      const queue: string[] = [startKey];
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      while (queue.length > 0) {
        const key = queue.shift()!;
        if (visited.has(key)) continue;
        visited.add(key);
        const [cx2, cy2] = key.split(",").map(Number);
        for (const [dx, dy] of dirs) {
          const nk = `${cx2 + dx},${cy2 + dy}`;
          if (ownedMap.has(nk) && !visited.has(nk)) queue.push(nk);
        }
      }
      return visited;
    };

    setTerritory((prev) => {
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];

      // Determine HQ cell for this clan
      let hqCellX: number | null = null;
      let hqCellY: number | null = null;
      if (myClan.hqPos) {
        hqCellX = Math.floor(myClan.hqPos.x / 20);
        hqCellY = Math.floor(myClan.hqPos.y / 20);
      }

      // If HQ is placed, only allow expanding from HQ-connected tiles
      if (hqCellX !== null && hqCellY !== null) {
        const connectedSet = getHQConnectedTiles(
          prev,
          myClan.id,
          hqCellX,
          hqCellY,
        );

        // If HQ cell itself is not yet claimed, seed it first
        if (!connectedSet.has(`${hqCellX},${hqCellY}`)) {
          const hqCell: TerritoryCell = {
            cellX: hqCellX,
            cellY: hqCellY,
            clanId: myClan.id,
          };
          const withHQ = [...prev, hqCell];
          localStorage.setItem(
            `ssmmo_territory_${username}`,
            JSON.stringify(withHQ),
          );
          return withHQ;
        }

        // Expand: candidates must be adjacent to HQ-connected tiles and unclaimed
        const candidates: { cellX: number; cellY: number }[] = [];
        for (const key of connectedSet) {
          const [cx2, cy2] = key.split(",").map(Number);
          for (const [dx, dy] of dirs) {
            const nx = cx2 + dx;
            const ny = cy2 + dy;
            const _nk = `${nx},${ny}`;
            if (!prev.some((t) => t.cellX === nx && t.cellY === ny)) {
              candidates.push({ cellX: nx, cellY: ny });
            }
          }
        }

        if (candidates.length === 0) {
          // All neighbors are taken; nothing to claim
          return prev;
        }

        // Pick closest candidate to player position for a smarter expansion feel
        const target =
          candidates[Math.floor(Math.random() * candidates.length)];
        const next = [
          ...prev,
          { cellX: target.cellX, cellY: target.cellY, clanId: myClan.id },
        ];
        localStorage.setItem(
          `ssmmo_territory_${username}`,
          JSON.stringify(next),
        );
        return next;
      }

      // No HQ yet — fall back to claiming around player base (first-time claim)
      const savedState = localStorage.getItem(`ssmmo_player_${username}`);
      let px = 50000;
      let py = 50000;
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.posX) px = parsed.posX;
          if (parsed.posY) py = parsed.posY;
        } catch {
          /* ignore */
        }
      }
      const baseCellX = Math.floor(px / 20);
      const baseCellY = Math.floor(py / 20);

      // Check if any existing clan tiles exist; expand from them if so
      const ownedTiles = prev.filter((t) => t.clanId === myClan.id);
      if (ownedTiles.length > 0) {
        const candidates: { cellX: number; cellY: number }[] = [];
        for (const cell of ownedTiles) {
          for (const [dx, dy] of dirs) {
            const nx = cell.cellX + dx;
            const ny = cell.cellY + dy;
            if (!prev.some((t) => t.cellX === nx && t.cellY === ny)) {
              candidates.push({ cellX: nx, cellY: ny });
            }
          }
        }
        if (candidates.length > 0) {
          const target =
            candidates[Math.floor(Math.random() * candidates.length)];
          const next = [
            ...prev,
            { cellX: target.cellX, cellY: target.cellY, clanId: myClan.id },
          ];
          localStorage.setItem(
            `ssmmo_territory_${username}`,
            JSON.stringify(next),
          );
          return next;
        }
      }

      // Truly first claim — seed 3×3 around base
      const newCells: TerritoryCell[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = baseCellX + dx;
          const ny = baseCellY + dy;
          if (!prev.some((t) => t.cellX === nx && t.cellY === ny)) {
            newCells.push({ cellX: nx, cellY: ny, clanId: myClan.id });
          }
        }
      }
      const next = [...prev, ...newCells];
      localStorage.setItem(`ssmmo_territory_${username}`, JSON.stringify(next));
      return next;
    });

    setClaimTileCooldown(Date.now() + 30000);
    return "claimed";
  }, [clans, username, claimTileCooldown]);

  // ── Declare War ──────────────────────────────────────────────────────────────
  const declareWar = useCallback(
    (targetClanId: string) => {
      setClans((prev) => {
        const myClan = prev.find((c) => c.memberUsernames.includes(username));
        if (!myClan || myClan.leaderUsername !== username) return prev;
        const next = prev.map((c) =>
          c.id === myClan.id
            ? {
                ...c,
                declaredWars: [
                  ...new Set([...(c.declaredWars || []), targetClanId]),
                ],
              }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
    },
    [username, serverId],
  );

  const endWar = useCallback(
    (targetClanId: string) => {
      setClans((prev) => {
        const myClan = prev.find((c) => c.memberUsernames.includes(username));
        if (!myClan || myClan.leaderUsername !== username) return prev;
        const next = prev.map((c) =>
          c.id === myClan.id
            ? {
                ...c,
                declaredWars: (c.declaredWars || []).filter(
                  (id) => id !== targetClanId,
                ),
              }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
    },
    [username, serverId],
  );

  const activateClanShield = useCallback(() => {
    setClans((prev) => {
      const myClan = prev.find((c) => c.memberUsernames.includes(username));
      if (!myClan || myClan.leaderUsername !== username) return prev;
      const now = Date.now();
      // Check cooldown
      if (
        myClan.clanShieldCooldownUntil &&
        myClan.clanShieldCooldownUntil > now
      )
        return prev;
      // Activate for 24h, cooldown 48h after expiry
      const activatedAt = now;
      const next = prev.map((c) =>
        c.id === myClan.id
          ? {
              ...c,
              clanShieldActive: true,
              clanShieldActivatedAt: activatedAt,
              clanShieldCooldownUntil: null,
            }
          : c,
      );
      localStorage.setItem(storageKey("clans", serverId), JSON.stringify(next));
      return next;
    });
  }, [username, serverId]);

  // Helper: check if two clans are at war
  const areClanAtWar = useCallback(
    (clanIdA: string | undefined, clanIdB: string | undefined): boolean => {
      if (!clanIdA || !clanIdB) return false;
      const clanA = clans.find((c) => c.id === clanIdA);
      const clanB = clans.find((c) => c.id === clanIdB);
      return (
        (clanA?.declaredWars || []).includes(clanIdB) ||
        (clanB?.declaredWars || []).includes(clanIdA)
      );
    },
    [clans],
  );

  // ── Attack NPC Base ──────────────────────────────────────────────────────────
  const attackNPCBase = useCallback((npcId: string, damage: number) => {
    setNpcBases((prev) =>
      prev.map((b) => {
        if (b.id !== npcId) return b;
        let wallHp = b.wallHp;
        let hp = b.hp;
        if (wallHp > 0) {
          wallHp = Math.max(0, wallHp - damage);
        } else {
          hp = Math.max(0, hp - damage);
        }
        return { ...b, hp, wallHp };
      }),
    );
  }, []);

  const attackDragon = useCallback((dragonId: string, damage: number) => {
    setDragons((prev) =>
      prev.map((d) => {
        if (d.id !== dragonId || !d.isAlive) return d;
        let armorHp = d.armorHp;
        let hp = d.hp;
        if (armorHp > 0) {
          const armorDmg = Math.floor(damage * 0.6);
          const hpDmg = damage - armorDmg;
          armorHp = Math.max(0, armorHp - armorDmg);
          hp = Math.max(0, hp - hpDmg);
        } else {
          hp = Math.max(0, hp - damage);
        }
        return { ...d, armorHp, hp, isAlive: hp > 0 };
      }),
    );
  }, []);

  // ── Relocate NPC Base ────────────────────────────────────────────────────────
  const relocateNPCBase = useCallback((id: string, x: number, y: number) => {
    setNpcBases((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, posX: x, posY: y, hp: b.maxHp, wallHp: b.maxWallHp }
          : b,
      ),
    );
  }, []);

  // ── Respawn Defeated Player (teleport to FAR opposite side of map) ─────────
  const respawnDefeatedPlayer = useCallback((playerId: string) => {
    setPlayers((prev) => {
      return prev.map((p) => {
        if (p.id !== playerId) return p;
        // Feature 3: Teleport to OPPOSITE/FAR side of map
        const newX =
          p.posX < 50000
            ? 70000 + Math.random() * 20000
            : 5000 + Math.random() * 20000;
        const newY =
          p.posY < 50000
            ? 70000 + Math.random() * 20000
            : 5000 + Math.random() * 20000;
        return {
          ...p,
          posX: newX,
          posY: newY,
          level: 1,
          hp: 1000,
          maxHp: 1000,
          wallHp: 500,
          maxWallHp: 500,
          gold: (p.gold || 0) + 5000,
          resources: {
            wood: (p.resources?.wood || 0) + 500,
            stone: (p.resources?.stone || 0) + 500,
            food: (p.resources?.food || 0) + 500,
          },
          kills: p.kills ?? 0,
          deaths: (p.deaths ?? 0) + 1,
        };
      });
    });
    // Also update myPlayer if it's the defeated one
    setMyPlayer((prev) => {
      if (!prev || prev.id !== playerId) return prev;
      const newX =
        prev.posX < 50000
          ? 70000 + Math.random() * 20000
          : 5000 + Math.random() * 20000;
      const newY =
        prev.posY < 50000
          ? 70000 + Math.random() * 20000
          : 5000 + Math.random() * 20000;
      return {
        ...prev,
        posX: newX,
        posY: newY,
        level: 1,
        hp: 1000,
        maxHp: 1000,
        wallHp: 500,
        maxWallHp: 500,
        gold: (prev.gold || 0) + 5000,
        deaths: (prev.deaths ?? 0) + 1,
      };
    });
  }, []);

  // ── Send Aid ────────────────────────────────────────────────────────────────
  const sendAid = useCallback(
    (
      receiverUsername: string,
      wood: number,
      stone: number,
      food: number,
      soldiers: number,
    ) => {
      // Deduct resources and troops from current player
      setMyPlayer((prev) => {
        if (!prev) return prev;
        const newWood = Math.max(0, prev.resources.wood - wood);
        const newStone = Math.max(0, prev.resources.stone - stone);
        const newFood = Math.max(0, prev.resources.food - food);
        const newSoldiers = Math.max(
          0,
          (prev.troops?.soldiers || 0) - soldiers,
        );
        return {
          ...prev,
          resources: { wood: newWood, stone: newStone, food: newFood },
          troops: prev.troops
            ? { ...prev.troops, soldiers: newSoldiers }
            : prev.troops,
        };
      });
      // Store pending aid for receiver in localStorage
      const key = `ssmmo_pending_aid_${receiverUsername}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({
        wood,
        stone,
        food,
        soldiers,
        from: username,
        timestamp: Date.now(),
      });
      localStorage.setItem(key, JSON.stringify(existing));
    },
    [username],
  );

  // ── Attack base ──────────────────────────────────────────────────────────────
  const attackBase = useCallback(
    (target: GamePlayer, damage: number): "shielded" | "attacked" => {
      // Check shield blocking
      const now_attack = Date.now();
      const targetClanCheck = clans.find((c) =>
        c.memberUsernames.includes(target.username),
      );
      const clanShieldOn =
        targetClanCheck?.clanShieldActive &&
        targetClanCheck.clanShieldActivatedAt &&
        now_attack - targetClanCheck.clanShieldActivatedAt <
          24 * 60 * 60 * 1000;
      if (target.shieldActive || clanShieldOn) {
        const myClan = clans.find((c) => c.memberUsernames.includes(username));
        const targetClan = clans.find((c) =>
          c.memberUsernames.includes(target.username),
        );
        const atWar = areClanAtWar(myClan?.id, targetClan?.id);
        if (!atWar) {
          return "shielded";
        }
      }

      // Attack flash
      const flashId = `f_${Date.now()}_${Math.random()}`;
      const flash: AttackFlash = {
        id: flashId,
        x: target.posX,
        y: target.posY,
        startTime: Date.now(),
      };
      setAttackFlashes((prev) => [...prev, flash]);
      setTimeout(
        () => setAttackFlashes((prev) => prev.filter((f) => f.id !== flashId)),
        600,
      );

      // Troop losses for attacker
      setMyPlayer((prev) => {
        if (!prev?.troops) return prev;
        const lossRate = (target.wallHp || 0) > 0 ? 0.05 : 0.02;
        const lostSoldiers = Math.max(
          1,
          Math.floor(prev.troops.soldiers * lossRate),
        );
        const surviving = Math.max(0, prev.troops.soldiers - lostSoldiers);

        if (lostSoldiers > 0) {
          const healId = `h_${Date.now()}_${Math.random()}`;
          const healMs = Math.max(30000, 60000 * (lostSoldiers / 100));
          const healEntry: HealingEntry = {
            id: healId,
            troops: lostSoldiers,
            completesAt: Date.now() + healMs,
          };
          setHealingQueue((hq) => [...hq, healEntry]);
        }

        return { ...prev, troops: { ...prev.troops, soldiers: surviving } };
      });

      // Resource drain on attacker after every attack
      setMyPlayer((prev) => {
        if (!prev) return prev;
        const woodDrain = Math.min(
          prev.resources.wood,
          Math.floor(prev.resources.wood * 0.1) + 50,
        );
        const stoneDrain = Math.min(
          prev.resources.stone,
          Math.floor(prev.resources.stone * 0.1) + 50,
        );
        const foodDrain = Math.min(
          prev.resources.food,
          Math.floor(prev.resources.food * 0.1) + 50,
        );
        return {
          ...prev,
          resources: {
            wood: Math.max(0, prev.resources.wood - woodDrain),
            stone: Math.max(0, prev.resources.stone - stoneDrain),
            food: Math.max(0, prev.resources.food - foodDrain),
          },
        };
      });

      triggerAttack(target.username, target.id, "base", damage);
      setPlayers((prev) =>
        prev.map((p) =>
          p.username === target.username
            ? { ...p, hp: Math.max(0, p.hp - damage) }
            : p,
        ),
      );

      if (target.hp - damage <= 0) {
        const cx = Math.floor(target.posX / 20);
        const cy = Math.floor(target.posY / 20);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            claimTerritory(cx + dx, cy + dy);
          }
        }
        // Feature 2: Track kills for attacker
        setMyPlayer((prev) => {
          if (!prev) return prev;
          return { ...prev, kills: (prev.kills ?? 0) + 1 };
        });
      }
      return "attacked";
    },
    [triggerAttack, claimTerritory, clans, username, areClanAtWar],
  );

  // ── Attack boss ──────────────────────────────────────────────────────────────
  const attackBoss = useCallback(
    async (damage: number) => {
      const flashId = `boss_${Date.now()}`;
      const flash: AttackFlash = {
        id: flashId,
        x: BOSS_X,
        y: BOSS_Y,
        startTime: Date.now(),
      };
      setAttackFlashes((prev) => [...prev, flash]);
      setTimeout(
        () => setAttackFlashes((prev) => prev.filter((f) => f.id !== flashId)),
        600,
      );

      let willDefeat = false;
      if (bossNPC && !bossNPC.defeated) {
        const _postWallHp =
          bossNPC.wallHp > 0
            ? Math.max(0, bossNPC.wallHp - damage)
            : bossNPC.wallHp;
        const postBaseHp =
          bossNPC.wallHp <= 0
            ? Math.max(0, bossNPC.baseHp - damage)
            : bossNPC.baseHp;
        willDefeat = postBaseHp <= 0;
      }

      setBossNPC((prev) => {
        if (!prev) return prev;
        let { wallHp, baseHp } = prev;
        if (wallHp > 0) {
          wallHp = Math.max(0, wallHp - damage);
        } else {
          baseHp = Math.max(0, baseHp - damage);
        }
        const defeated = baseHp <= 0 && !prev.defeated;
        const newCooldown = defeated
          ? Date.now() + 30 * 60 * 1000
          : prev.shieldCooldownUntil;
        return {
          ...prev,
          wallHp,
          baseHp,
          defeated: baseHp <= 0,
          shieldCooldownUntil: newCooldown,
        };
      });

      if (willDefeat) {
        setClans((prev) => {
          const myClan = prev.find((c) => c.memberUsernames.includes(username));
          if (!myClan) return prev;
          const next = prev.map((c) =>
            c.id === myClan.id
              ? { ...c, clanPoints: (c.clanPoints || 0) + 10000 }
              : c,
          );
          localStorage.setItem(
            storageKey("clans", serverId),
            JSON.stringify(next),
          );
          return next;
        });
      }

      if (actor) {
        try {
          await actor.attackBossNPC(BigInt(serverId), BigInt(damage));
          const updated = await actor.getBossNPC(BigInt(serverId));
          setBossNPC({
            baseHp: Number(updated.baseHp),
            wallHp: Number(updated.wallHp),
            maxBaseHp: 50000,
            maxWallHp: 30000,
            shieldCooldownUntil:
              Number(updated.shieldCooldownUntil) / 1_000_000,
            defeated: updated.defeated,
          });
        } catch {
          // local state used
        }
      }
    },
    [actor, serverId, username, bossNPC],
  );

  // ── Build Clan HQ ────────────────────────────────────────────────────────────
  const buildClanHQ = useCallback(
    (x: number, y: number) => {
      setClans((prev) => {
        const myClan = prev.find((c) => c.memberUsernames.includes(username));
        if (!myClan) return prev;
        if (myClan.leaderUsername !== username) return prev;
        if (myClan.hqDestroyedAt && myClan.hqDestroyedAt > 0) {
          const cooldownEnd = myClan.hqDestroyedAt + 60 * 60 * 1000;
          if (Date.now() < cooldownEnd) return prev;
        }
        const next = prev.map((c) =>
          c.id === myClan.id
            ? {
                ...c,
                hqPos: { x, y },
                hqHp: 100000,
                hqWallHp: 100000,
                hqDestroyedAt: 0,
                hqTeleportsToday: 0,
              }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
    },
    [username, serverId],
  );

  // ── Teleport Clan HQ ─────────────────────────────────────────────────────────
  const teleportClanHQ = useCallback(
    (x: number, y: number): boolean => {
      let success = false;
      const today = Math.floor(Date.now() / 86400000);
      setClans((prev) => {
        const myClan = prev.find((c) => c.memberUsernames.includes(username));
        if (!myClan) return prev;
        if (myClan.leaderUsername !== username) return prev;
        const lastDay = myClan.hqLastTeleportDay || 0;
        const usedToday = lastDay === today ? myClan.hqTeleportsToday || 0 : 0;
        if (usedToday >= 2) return prev;
        success = true;
        const next = prev.map((c) =>
          c.id === myClan.id
            ? {
                ...c,
                hqPos: { x, y },
                hqTeleportsToday: usedToday + 1,
                hqLastTeleportDay: today,
              }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
      return success;
    },
    [username, serverId],
  );

  // ── Attack Clan HQ ───────────────────────────────────────────────────────────
  const attackClanHQ = useCallback(
    (targetClanId: string, damage: number) => {
      setClans((prev) => {
        const next = prev.map((c) => {
          if (c.id !== targetClanId) return c;
          let wallHp = c.hqWallHp || 0;
          let hp = c.hqHp || 0;
          if (wallHp > 0) {
            wallHp = Math.max(0, wallHp - damage);
          } else {
            hp = Math.max(0, hp - damage);
          }
          const destroyed = hp <= 0;
          return {
            ...c,
            hqWallHp: wallHp,
            hqHp: hp,
            hqDestroyedAt: destroyed ? Date.now() : c.hqDestroyedAt,
            hqPos: destroyed ? undefined : c.hqPos,
            memberUsernames: destroyed ? [] : c.memberUsernames,
          };
        });
        const filtered = next.filter(
          (c) => c.memberUsernames.length > 0 || c.hqPos,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(filtered),
        );
        return filtered;
      });
    },
    [serverId],
  );

  // ── Spend Clan Points ────────────────────────────────────────────────────────
  const spendClanPoints = useCallback(
    (upgradeKey: keyof ClanUpgrades, cost: number) => {
      setClans((prev) => {
        const myClan = prev.find((c) => c.memberUsernames.includes(username));
        if (!myClan) return prev;
        if ((myClan.clanPoints || 0) < cost) return prev;
        const currentLevel = myClan.clanUpgrades?.[upgradeKey] || 0;
        if (currentLevel >= 25) return prev;
        const next = prev.map((c) =>
          c.id === myClan.id
            ? {
                ...c,
                clanPoints: (c.clanPoints || 0) - cost,
                clanUpgrades: {
                  defenseBonus: 0,
                  attackBonus: 0,
                  trainingBonus: 0,
                  troopCap: 0,
                  ...(c.clanUpgrades || {}),
                  [upgradeKey]: currentLevel + 1,
                },
              }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
    },
    [username, serverId],
  );

  // ── Donate Gold for HQ Points ──────────────────────────────────────────────
  const donateGoldForHQPoints = useCallback(
    (goldAmount: number) => {
      if (!myPlayer) return false;
      const currentGold = myPlayer.gold || 0;
      if (currentGold < goldAmount || goldAmount <= 0) return false;
      // 1 HQ point per 100 gold donated
      const pointsGained = Math.floor(goldAmount / 100);
      if (pointsGained <= 0) return false;
      setMyPlayer((prev) => {
        if (!prev) return prev;
        return { ...prev, gold: Math.max(0, (prev.gold || 0) - goldAmount) };
      });
      setClans((prev) => {
        const myClan = prev.find((c) => c.memberUsernames.includes(username));
        if (!myClan) return prev;
        const next = prev.map((c) =>
          c.id === myClan.id
            ? { ...c, clanPoints: (c.clanPoints || 0) + pointsGained }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
      return true;
    },
    [myPlayer, username, serverId],
  );

  // ── Change Member Rank ───────────────────────────────────────────────────────
  const changeMemberRank = useCallback(
    (clanId: string, targetUsername: string, rank: string) => {
      setClans((prev) => {
        const next = prev.map((c) => {
          if (c.id !== clanId || c.leaderUsername !== username) return c;
          return {
            ...c,
            memberRanks: { ...(c.memberRanks || {}), [targetUsername]: rank },
          };
        });
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
    },
    [username, serverId],
  );

  // ── Shield toggle ────────────────────────────────────────────────────────────
  const toggleShield = useCallback(
    (active: boolean) => {
      const now = Date.now();
      if (active && shieldCooldownUntil > now) return;
      setMyShieldActive(active);
      setMyPlayer((prev) => (prev ? { ...prev, shieldActive: active } : prev));
    },
    [shieldCooldownUntil],
  );

  useEffect(() => {
    if (bossNPC?.defeated && bossNPC.shieldCooldownUntil > Date.now()) {
      setShieldCooldownUntil(bossNPC.shieldCooldownUntil);
    }
  }, [bossNPC]);

  // ── Teleport ─────────────────────────────────────────────────────────────────
  const useTeleport = useCallback(
    (chargeId: number, x: number, y: number): boolean => {
      const now = Date.now();
      const charge = teleports.find((t) => t.id === chargeId);
      if (!charge || charge.cooldownUntil > now) return false;
      setTeleports((prev) =>
        prev.map((t) =>
          t.id === chargeId ? { ...t, cooldownUntil: now + 300000 } : t,
        ),
      );
      setMyPlayer((prev) => (prev ? { ...prev, posX: x, posY: y } : prev));
      return true;
    },
    [teleports],
  );

  // ── Upgrade structure ────────────────────────────────────────────────────────
  const upgradeStructure = useCallback(
    async (type: string) => {
      const level = upgradesRef.current[type as keyof UpgradeState] || 1;
      const woodCost = level * 100;
      const stoneCost = level * 50;
      const foodCost = level * 75;

      let canAfford = false;
      setMyPlayer((prev) => {
        if (!prev) return prev;
        if (
          prev.resources.wood >= woodCost &&
          prev.resources.stone >= stoneCost &&
          prev.resources.food >= foodCost
        ) {
          canAfford = true;
          return {
            ...prev,
            resources: {
              wood: prev.resources.wood - woodCost,
              stone: prev.resources.stone - stoneCost,
              food: prev.resources.food - foodCost,
            },
          };
        }
        return prev;
      });

      if (!canAfford) {
        if (username !== "SableSoulreaver") return;
      }

      setUpgrades((prev) => ({
        ...prev,
        [type]: Math.min(10, (prev[type as keyof UpgradeState] || 1) + 1),
      }));

      if (actor) {
        try {
          await actor.upgradeBase(type);
        } catch {
          // ignore
        }
      }
    },
    [actor, username],
  );

  // ── Resource harvesting ──────────────────────────────────────────────────────
  const harvestResource = useCallback(
    (fieldId: string) => {
      const now = Date.now();
      if ((harvestCooldownRef.current[fieldId] || 0) > now) return;
      const field = resources.find((r) => r.id === fieldId);
      if (!field) return;

      setMyPlayer((prev) => {
        if (!prev) return prev;
        const dist = Math.sqrt(
          (field.x - prev.posX) ** 2 + (field.y - prev.posY) ** 2,
        );
        if (dist > 80) return prev;
        const amount = 50 + Math.floor(Math.random() * 51);
        harvestCooldownRef.current[fieldId] = now + 60000;
        return {
          ...prev,
          resources: {
            ...prev.resources,
            [field.type]: prev.resources[field.type] + amount,
          },
        };
      });
    },
    [resources],
  );

  // ── Garrison troops on resource field ────────────────────────────────────────
  const garrisonTroops = useCallback(
    (fieldId: string, count: number) => {
      const myClan = clans.find((c) => c.memberUsernames.includes(username));
      setResources((prev) => {
        const next = prev.map((r) => {
          if (r.id !== fieldId) return r;
          return {
            ...r,
            occupyingTroops: {
              username,
              clanId: myClan?.id || "",
              count,
            },
          };
        });
        localStorage.setItem(
          storageKey("resources", serverId),
          JSON.stringify(next),
        );
        return next;
      });
      // Deduct troops from player
      setMyPlayer((prev) => {
        if (!prev?.troops) return prev;
        const soldiers = Math.max(0, prev.troops.soldiers - count);
        return { ...prev, troops: { ...prev.troops, soldiers } };
      });
    },
    [username, serverId, clans],
  );

  // ── Resource capture ─────────────────────────────────────────────────────────
  const captureResource = useCallback(
    (fieldId: string): CaptureResult => {
      const myClan = clans.find((c) => c.memberUsernames.includes(username));
      const field = resources.find((r) => r.id === fieldId);
      if (!field) return "captured";

      const guardDamage = 1000;

      // Check guard strength
      if ((field.guardStrength || 0) > 0) {
        const newGuardStrength = Math.max(
          0,
          (field.guardStrength || 0) - guardDamage,
        );
        const guardsDefeated = newGuardStrength <= 0;

        setResources((prev) => {
          const next = prev.map((r) =>
            r.id === fieldId ? { ...r, guardStrength: newGuardStrength } : r,
          );
          localStorage.setItem(
            storageKey("resources", serverId),
            JSON.stringify(next),
          );
          return next;
        });

        if (field.type === "gold") {
          const currentGold = Number(
            localStorage.getItem(`ssmmo_gold_${serverId}`) || "0",
          );
          const goldGained = guardsDefeated ? 500 : 100;
          const newGold = currentGold + goldGained;
          localStorage.setItem(`ssmmo_gold_${serverId}`, String(newGold));
          setMyPlayer((prev) => (prev ? { ...prev, gold: newGold } : prev));
        }
        harvestResource(fieldId);
        return guardsDefeated ? "guards_defeated" : "guards_remaining";
      }

      // Check occupying troops - always drain on every attack
      if (field.occupyingTroops) {
        const troopDamage = 1000;
        const newCount = Math.max(0, field.occupyingTroops.count - troopDamage);
        const troopsDefeated = newCount <= 0;

        if (troopsDefeated) {
          // Capture the field
          setResources((prev) => {
            const next = prev.map((r) =>
              r.id === fieldId
                ? {
                    ...r,
                    controlledByClanId: myClan?.id,
                    occupyingTroops: null,
                  }
                : r,
            );
            localStorage.setItem(
              storageKey("resources", serverId),
              JSON.stringify(next),
            );
            return next;
          });
          if (field.type === "gold") {
            const currentGold = Number(
              localStorage.getItem(`ssmmo_gold_${serverId}`) || "0",
            );
            const newGold = currentGold + 500;
            localStorage.setItem(`ssmmo_gold_${serverId}`, String(newGold));
            setMyPlayer((prev) => (prev ? { ...prev, gold: newGold } : prev));
          }
          harvestResource(fieldId);
          return "troops_defeated";
        }
        // Reduce enemy troop count
        setResources((prev) => {
          const next = prev.map((r) =>
            r.id === fieldId && r.occupyingTroops
              ? {
                  ...r,
                  occupyingTroops: { ...r.occupyingTroops, count: newCount },
                }
              : r,
          );
          localStorage.setItem(
            storageKey("resources", serverId),
            JSON.stringify(next),
          );
          return next;
        });
        return "occupied_by_enemy";
      }

      // Capture normally
      setResources((prev) => {
        const next = prev.map((r) =>
          r.id === fieldId ? { ...r, controlledByClanId: myClan?.id } : r,
        );
        localStorage.setItem(
          storageKey("resources", serverId),
          JSON.stringify(next),
        );
        return next;
      });
      if (field.type === "gold") {
        const currentGold = Number(
          localStorage.getItem(`ssmmo_gold_${serverId}`) || "0",
        );
        const newGold = currentGold + 200;
        localStorage.setItem(`ssmmo_gold_${serverId}`, String(newGold));
        setMyPlayer((prev) => (prev ? { ...prev, gold: newGold } : prev));
      }
      harvestResource(fieldId);
      return "captured";
    },
    [clans, username, serverId, harvestResource, resources],
  );

  // ── Share link ───────────────────────────────────────────────────────────────
  const getShareLink = useCallback(() => {
    return `${window.location.origin}?server=${serverId}`;
  }, [serverId]);

  // ── Clan management ──────────────────────────────────────────────────────────
  const createClan = useCallback(
    async (name: string, color: string) => {
      const id = `clan_${serverId}_${Date.now()}`;
      const newClan: LocalClan = {
        id,
        name,
        color,
        serverId,
        memberUsernames: [username],
        leaderUsername: username,
        declaredWars: [],
      };
      if (actor) {
        try {
          await actor.createClan(name, color, BigInt(serverId));
        } catch {
          // store locally
        }
      }
      setClans((prev) => {
        const next = [...prev, newClan];
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
      setMyPlayer((prev) => (prev ? { ...prev, clanId: id } : prev));
      localStorage.setItem(`ssmmo_myClanId_${serverId}`, id);
    },
    [actor, username, serverId],
  );

  const joinClanById = useCallback(
    (clanId: string) => {
      setClans((prev) => {
        const next = prev.map((c) =>
          c.id === clanId
            ? {
                ...c,
                memberUsernames: [
                  ...c.memberUsernames.filter((u) => u !== username),
                  username,
                ],
              }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
      setMyPlayer((prev) => (prev ? { ...prev, clanId } : prev));
      localStorage.setItem(`ssmmo_myClanId_${serverId}`, clanId);
    },
    [username, serverId],
  );

  const kickMember = useCallback(
    (clanId: string, targetUsername: string) => {
      setClans((prev) => {
        const next = prev.map((c) =>
          c.id === clanId && c.leaderUsername === username
            ? {
                ...c,
                memberUsernames: c.memberUsernames.filter(
                  (u) => u !== targetUsername,
                ),
              }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
    },
    [username, serverId],
  );

  const setClanMOTD = useCallback((clanId: string, motd: string) => {
    localStorage.setItem(`ssmmo_motd_${clanId}`, motd);
    setClans((prev) => prev.map((c) => (c.id === clanId ? { ...c, motd } : c)));
  }, []);

  const leaveClan = useCallback(() => {
    const myClan = clans.find((c) => c.memberUsernames.includes(username));
    if (!myClan) return;
    setClans((prev) => {
      const next = prev.map((c) => {
        if (c.id !== myClan.id) return c;
        const newMembers = c.memberUsernames.filter((u) => u !== username);
        const newLeader =
          c.leaderUsername === username && newMembers.length > 0
            ? newMembers[0]
            : c.leaderUsername;
        return { ...c, memberUsernames: newMembers, leaderUsername: newLeader };
      });
      localStorage.setItem(storageKey("clans", serverId), JSON.stringify(next));
      return next;
    });
    setMyPlayer((prev) => (prev ? { ...prev, clanId: undefined } : prev));
    localStorage.removeItem(`ssmmo_myClanId_${serverId}`);
  }, [username, clans, serverId]);

  const promoteMember = useCallback(
    (clanId: string, targetUsername: string) => {
      setClans((prev) => {
        const next = prev.map((c) =>
          c.id === clanId && c.leaderUsername === username
            ? { ...c, leaderUsername: targetUsername }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });
    },
    [username, serverId],
  );

  // ── Save / Load ──────────────────────────────────────────────────────────────
  const saveGame = useCallback(() => {
    const save: GameSave = {
      players,
      clans,
      territory,
      resources,
      timestamp: Date.now(),
      serverId,
    };
    localStorage.setItem(storageKey("save", serverId), JSON.stringify(save));
    // Also persist player-specific state
    if (myPlayer) {
      localStorage.setItem(`ssmmo_posX_${serverId}`, String(myPlayer.posX));
      localStorage.setItem(`ssmmo_posY_${serverId}`, String(myPlayer.posY));
      localStorage.setItem(`ssmmo_myHp_${serverId}`, String(myPlayer.hp));
      localStorage.setItem(
        `ssmmo_gold_${serverId}`,
        String(myPlayer.gold || 0),
      );
    }
    return save;
  }, [players, clans, territory, resources, serverId, myPlayer]);

  const loadGame = useCallback(() => {
    const raw = localStorage.getItem(storageKey("save", serverId));
    if (!raw) return false;
    const save: GameSave = JSON.parse(raw);
    setPlayers(save.players);
    setClans(save.clans);
    setTerritory(save.territory);
    setResources(save.resources);
    return true;
  }, [serverId]);

  // ── Clan invite detection ────────────────────────────────────────────────────
  useEffect(() => {
    for (const msg of chatMessages) {
      if (processedInviteIdsRef.current.has(msg.id)) continue;
      if (!msg.content.startsWith("SSMMO_INVITE:")) continue;
      processedInviteIdsRef.current.add(msg.id);
      if (msg.timestamp < mountTimeRef.current) continue;
      try {
        const data = JSON.parse(msg.content.slice("SSMMO_INVITE:".length));
        if (data.to === username) {
          setClanInvites((prev) => {
            if (prev.some((inv) => inv.id === msg.id)) return prev;
            return [
              ...prev,
              {
                id: msg.id,
                fromUsername: msg.username,
                clanId: data.clanId,
                clanName: data.clanName,
                clanColor: data.clanColor,
                timestamp: msg.timestamp,
              },
            ];
          });
        }
      } catch {
        // malformed invite
      }
    }
  }, [chatMessages, username]);

  const sendClanInvite = useCallback(
    async (targetUsername: string) => {
      const myClan = clans.find((c) => c.memberUsernames.includes(username));
      if (!myClan) return;
      const payload = JSON.stringify({
        to: targetUsername,
        clanId: myClan.id,
        clanName: myClan.name,
        clanColor: myClan.color,
      });
      await sendChat(`SSMMO_INVITE:${payload}`);
    },
    [clans, username, sendChat],
  );

  const acceptClanInvite = useCallback(
    (inviteId: string, clanId: string) => {
      joinClanById(clanId);
      setClanInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    },
    [joinClanById],
  );

  const declineClanInvite = useCallback((inviteId: string) => {
    setClanInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
  }, []);

  // ── Add Spy Planes (from shop purchase) ──────────────────────────────────
  const addSpyPlanes = useCallback((count: number) => {
    setMyPlayer((prev) => {
      if (!prev) return prev;
      return { ...prev, spyPlanes: (prev.spyPlanes ?? 0) + count };
    });
  }, []);

  // ── Deploy Spy Plane ──────────────────────────────────────────────────────
  const deploySpyPlane = useCallback(() => {
    if (!myPlayer) return false;
    const currentPlanes = myPlayer.spyPlanes ?? 0;
    if (currentPlanes <= 0) return false;

    // Decrement spy plane count
    setMyPlayer((prev) => {
      if (!prev) return prev;
      return { ...prev, spyPlanes: Math.max(0, (prev.spyPlanes ?? 0) - 1) };
    });

    // Pick a random heading angle
    const angle = Math.random() * Math.PI * 2;
    const PLANE_RANGE = 60000; // how far it flies
    const spyPlane: SpyPlane = {
      id: `spy_${Date.now()}_${Math.random()}`,
      ownerId: myPlayer.id,
      ownerUsername: myPlayer.username,
      x: myPlayer.posX,
      y: myPlayer.posY,
      targetX: myPlayer.posX + Math.cos(angle) * PLANE_RANGE,
      targetY: myPlayer.posY + Math.sin(angle) * PLANE_RANGE,
      angle,
      launchedAt: Date.now(),
      active: true,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    setActiveSpyPlanes((prev) => [...prev, spyPlane]);
    return true;
  }, [myPlayer]);

  // ── Spy Plane tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const SPY_PLANE_SPEED = 1200; // map units per second
    const interval = setInterval(() => {
      const dt = 0.5;
      const now = Date.now();
      setActiveSpyPlanes((prev) => {
        if (prev.length === 0) return prev;
        const next = prev
          .filter((p) => p.expiresAt > now - 2000) // keep for 2s after expiry for fade
          .map((plane) => {
            if (!plane.active) return plane;
            const dx = plane.targetX - plane.x;
            const dy = plane.targetY - plane.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = SPY_PLANE_SPEED * dt;
            if (dist <= step || now >= plane.expiresAt) {
              return { ...plane, active: false };
            }
            const nx = plane.x + (dx / dist) * step;
            const ny = plane.y + (dy / dist) * step;
            return { ...plane, x: nx, y: ny };
          });
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [screen]);

  // ── Return ───────────────────────────────────────────────────────────────────
  // ── Launch Atom Bomb ─────────────────────────────────────────────────────────
  const launchAtomBomb = useCallback(
    (targetPlayerId: string) => {
      const myClan = clans.find((c) => c.memberUsernames.includes(username));
      if (!myClan) {
        return false;
      }
      // Leader-only check
      if (myClan.leaderUsername !== username) {
        return false;
      }
      if (!myClan.hqPos) {
        return false;
      }
      // 4-day cooldown check (345,600,000 ms)
      const ATOM_BOMB_COOLDOWN = 4 * 24 * 60 * 60 * 1000;
      const lastUsed = myClan.atomBombLastUsed ?? 0;
      const elapsed = Date.now() - lastUsed;
      if (lastUsed > 0 && elapsed < ATOM_BOMB_COOLDOWN) {
        const remaining = ATOM_BOMB_COOLDOWN - elapsed;
        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (mins > 0) parts.push(`${mins}m`);
        parts.push(`${secs}s`);
        return false;
      }
      const bombsUsed = myClan.atomBombsUsed ?? 0;
      if (bombsUsed >= 2) {
        return false;
      }
      // Must target a real player (not NPC)
      const allServerPlayers = players;
      const target = allServerPlayers.find((p) => p.id === targetPlayerId);
      if (!target) return false;
      if (target.username === username) return false;

      // Increment atomBombsUsed on clan HQ + set cooldown timestamp
      setClans((prev) => {
        const next = prev.map((c) =>
          c.id === myClan.id
            ? {
                ...c,
                atomBombsUsed: (c.atomBombsUsed ?? 0) + 1,
                atomBombLastUsed: Date.now(),
              }
            : c,
        );
        localStorage.setItem(
          storageKey("clans", serverId),
          JSON.stringify(next),
        );
        return next;
      });

      // Create the bomb
      const bomb: AtomBomb = {
        id: `abomb_${Date.now()}_${Math.random()}`,
        sourceClanId: myClan.id,
        sourceClanName: myClan.name,
        targetPlayerId,
        targetPlayerName: target.username,
        x: myClan.hqPos.x,
        y: myClan.hqPos.y,
        targetX: target.posX,
        targetY: target.posY,
        launchX: myClan.hqPos.x,
        launchY: myClan.hqPos.y,
        launchedAt: Date.now(),
        exploded: false,
      };
      setAtomBombs((prev) => [...prev, bomb]);

      // Broadcast notification
      const notif: AttackNotification = {
        id: `abomb_notif_${Date.now()}`,
        message: `☢️ ATOM BOMB — ${myClan.name} launched at ${target.username}!`,
        timestamp: Date.now(),
      };
      setAttackNotifications((prev) => [...prev, notif]);
      setTimeout(() => {
        setAttackNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      }, 5000);

      return true;
    },
    [clans, username, players, serverId],
  );

  // ── Atom Bomb tick (update positions and check detonation) ───────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const BOMB_SPEED = 800; // map units per second
    const interval = setInterval(() => {
      const dt = 0.5; // 500ms tick = 0.5s
      const allServerPlayers = players;
      setAtomBombs((prev) => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        let changed = false;
        const next = prev.map((bomb) => {
          if (bomb.exploded) {
            // Remove exploded bombs after 2s animation
            return bomb;
          }
          // Update target position to follow teleporting player
          const target = allServerPlayers.find(
            (p) => p.id === bomb.targetPlayerId,
          );
          let targetX = bomb.targetX;
          let targetY = bomb.targetY;
          if (target) {
            targetX = target.posX;
            targetY = target.posY;
          } else {
            // Target gone (destroyed) — cancel bomb
            changed = true;
            return { ...bomb, exploded: true, explodedAt: now };
          }

          // Move bomb toward target
          const dx = targetX - bomb.x;
          const dy = targetY - bomb.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            // Hit! Deal damage
            changed = true;
            const ATOM_BOMB_DAMAGE = 50000;
            setPlayers((ps) =>
              ps.map((p) =>
                p.id === bomb.targetPlayerId
                  ? { ...p, hp: Math.max(0, p.hp - ATOM_BOMB_DAMAGE) }
                  : p,
              ),
            );
            // Hit notification
            const hitNotif: AttackNotification = {
              id: `abomb_hit_${Date.now()}`,
              message: `☢️ ATOM BOMB HIT — ${bomb.targetPlayerName}'s base was hit for 50,000 damage!`,
              timestamp: Date.now(),
            };
            setAttackNotifications((n) => [...n, hitNotif]);
            setTimeout(() => {
              setAttackNotifications((n) =>
                n.filter((x) => x.id !== hitNotif.id),
              );
            }, 6000);
            return {
              ...bomb,
              x: targetX,
              y: targetY,
              targetX,
              targetY,
              exploded: true,
              explodedAt: now,
            };
          }

          const moveX = (dx / dist) * BOMB_SPEED * dt;
          const moveY = (dy / dist) * BOMB_SPEED * dt;
          changed = true;
          return {
            ...bomb,
            x: bomb.x + moveX,
            y: bomb.y + moveY,
            targetX,
            targetY,
          };
        });

        // Clean up exploded bombs after 3 seconds
        const cleaned = next.filter(
          (b) => !b.exploded || (b.explodedAt && now - b.explodedAt < 3000),
        );
        return changed
          ? cleaned
          : cleaned.length !== prev.length
            ? cleaned
            : prev;
      });
    }, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, players]);

  return {
    // Core
    screen,
    setScreen,
    username,
    setUsername,
    serverId,
    setServerId,
    players,
    myPlayer,
    setMyPlayer,
    clans,
    territory,
    resources,
    chatMessages,
    attackNotifications,
    serverInfos,
    fetchServerInfos,
    joinServer,
    sendChat,
    triggerAttack,
    createClan,
    joinClanById,
    claimTerritory,
    claimNearbyTiles,
    claimTileCooldown,
    captureResource,
    garrisonTroops,
    attackBase,
    saveGame,
    loadGame,
    saveLocalState,
    // New features
    myShieldActive,
    shieldCooldownUntil,
    bossNPC,
    attackFlashes,
    healingQueue,
    trainingQueue,
    upgrades,
    teleports,
    trainingInterval,
    lastTrainingAt,
    useTeleport,
    toggleShield,
    attackBoss,
    upgradeStructure,
    harvestResource,
    getShareLink,
    kickMember,
    setClanMOTD,
    leaveClan,
    promoteMember,
    // HQ + clan points
    buildClanHQ,
    teleportClanHQ,
    attackClanHQ,
    spendClanPoints,
    donateGoldForHQPoints,
    changeMemberRank,
    // Clan invites
    clanInvites,
    sendClanInvite,
    acceptClanInvite,
    declineClanInvite,
    // War
    declareWar,
    endWar,
    activateClanShield,
    areClanAtWar,
    npcBases,
    attackNPCBase,
    sendAid,
    dragons,
    attackDragon,
    relocateNPCBase,
    respawnDefeatedPlayer,
    atomBombs,
    launchAtomBomb,
    activeSpyPlanes,
    deploySpyPlane,
    addSpyPlanes,
  };
}
