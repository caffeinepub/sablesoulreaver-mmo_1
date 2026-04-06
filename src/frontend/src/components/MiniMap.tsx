import type React from "react";
import type {
  BossState,
  DragonNPC,
  GamePlayer,
  LocalClan,
  NPCBase,
  ResourceField,
  TerritoryCell,
} from "../types/game";
import { CELL_SIZE, WORLD_SIZE } from "../types/game";

const BOSS_X = 50000;
const BOSS_Y = 50000;

interface Props {
  players: GamePlayer[];
  myPlayer: GamePlayer | null;
  clans: LocalClan[];
  territory: TerritoryCell[];
  cameraX: number;
  cameraY: number;
  viewW: number;
  viewH: number;
  onNavigate: (x: number, y: number) => void;
  resources: ResourceField[];
  npcBases: NPCBase[];
  bossNPC: BossState | null;
  dragons?: DragonNPC[];
}

const MINI_SIZE = 160;

const RESOURCE_COLORS: Record<string, string> = {
  wood: "#4caf50",
  stone: "#9e9e9e",
  food: "#ffeb3b",
  gold: "#ffd700",
};

export function MiniMap({
  players,
  myPlayer,
  clans,
  territory,
  cameraX,
  cameraY,
  viewW,
  viewH,
  onNavigate,
  resources,
  npcBases,
  bossNPC,
  dragons,
}: Props) {
  const allPlayers = [...players];
  if (myPlayer && !allPlayers.find((p) => p.username === myPlayer.username)) {
    allPlayers.push(myPlayer);
  }

  const handleNav = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / MINI_SIZE;
    const ry = (e.clientY - rect.top) / MINI_SIZE;
    const worldX = rx * WORLD_SIZE - viewW / 2;
    const worldY = ry * WORLD_SIZE - viewH / 2;
    onNavigate(worldX, worldY);
  };

  const wx = (worldX: number) => (worldX / WORLD_SIZE) * MINI_SIZE;
  const wy = (worldY: number) => (worldY / WORLD_SIZE) * MINI_SIZE;

  return (
    <button
      type="button"
      className="absolute bottom-4 right-4 rounded-lg overflow-hidden cursor-pointer z-20"
      style={{
        width: MINI_SIZE,
        height: MINI_SIZE,
        background: "rgba(10,25,5,0.9)",
        border: "2px solid rgba(100,200,50,0.4)",
        padding: 0,
      }}
      onClick={handleNav}
    >
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, #1C3A0A, #0F2005)" }}
      />

      {/* Viewport box */}
      <div
        className="absolute border-2"
        style={{
          left: (cameraX / WORLD_SIZE) * MINI_SIZE,
          top: (cameraY / WORLD_SIZE) * MINI_SIZE,
          width: (viewW / WORLD_SIZE) * MINI_SIZE,
          height: (viewH / WORLD_SIZE) * MINI_SIZE,
          borderColor: "rgba(255,255,255,0.4)",
          minWidth: 8,
          minHeight: 8,
        }}
      />

      {/* Clan territory tiles */}
      {clans.map((clan) => {
        const clanTiles = territory.filter((t) => t.clanId === clan.id);
        return clanTiles.map((tile) => (
          <div
            key={`t-${tile.cellX}-${tile.cellY}`}
            className="absolute"
            style={{
              left: wx(tile.cellX * CELL_SIZE),
              top: wy(tile.cellY * CELL_SIZE),
              width: Math.max(1, (CELL_SIZE / WORLD_SIZE) * MINI_SIZE),
              height: Math.max(1, (CELL_SIZE / WORLD_SIZE) * MINI_SIZE),
              background: clan.color,
              opacity: 0.45,
            }}
          />
        ));
      })}

      {/* Resource fields */}
      {resources.map((field) => {
        const color = RESOURCE_COLORS[field.type] || "#aaa";
        const isGold = field.type === "gold";
        return (
          <div
            key={field.id}
            className="absolute"
            style={{
              left: wx(field.x) - 2,
              top: wy(field.y) - 2,
              width: 4,
              height: 4,
              background: color,
              borderRadius: isGold ? "50%" : "1px",
              boxShadow: isGold ? `0 0 3px ${color}` : undefined,
              opacity: 0.8,
            }}
          />
        );
      })}

      {/* Clan HQs */}
      {clans
        .filter((c) => c.hqPos && (c.hqHp ?? 0) > 0)
        .map((clan) => (
          <div
            key={`hq-${clan.id}`}
            className="absolute"
            title={`${clan.name} HQ`}
            style={{
              left: wx(clan.hqPos!.x) - 2.5,
              top: wy(clan.hqPos!.y) - 2.5,
              width: 5,
              height: 5,
              background: clan.color,
              border: "1px solid rgba(255,255,255,0.6)",
              boxShadow: `0 0 4px ${clan.color}`,
            }}
          />
        ))}

      {/* NPC bases */}
      {npcBases
        .filter((b) => b.hp > 0)
        .map((base) => (
          <div
            key={base.id}
            className="absolute rounded-full"
            style={{
              left: wx(base.posX) - 1.5,
              top: wy(base.posY) - 1.5,
              width: 3,
              height: 3,
              background: "#9c27b0",
              opacity: 0.75,
            }}
          />
        ))}

      {/* Boss NPC */}
      {bossNPC && !bossNPC.defeated && (
        <div
          className="absolute"
          style={{
            left: wx(BOSS_X) - 3,
            top: wy(BOSS_Y) - 3,
            width: 6,
            height: 6,
            background: "#ff1744",
            borderRadius: "50%",
            boxShadow: "0 0 6px #ff1744, 0 0 10px #ff9800",
            animation: "pulse 1s infinite alternate",
          }}
          title="Boss NPC"
        />
      )}

      {/* Dragon NPCs */}
      {dragons
        ?.filter((d) => d.isAlive)
        .map((dragon) => (
          <div
            key={dragon.id}
            className="absolute rounded-full"
            title={dragon.name}
            style={{
              left: wx(dragon.posX) - 2.5,
              top: wy(dragon.posY) - 2.5,
              width: 5,
              height: 5,
              background: "#ff6600",
              boxShadow: "0 0 4px #ff4400, 0 0 8px #ff2200",
            }}
          />
        ))}

      {/* Player dots */}
      {allPlayers.map((player) => {
        const clan = clans.find((c) =>
          c.memberUsernames.includes(player.username),
        );
        const color =
          player.username === myPlayer?.username
            ? "#ffffff"
            : clan?.color || "#888888";
        const x = (player.posX / WORLD_SIZE) * MINI_SIZE;
        const y = (player.posY / WORLD_SIZE) * MINI_SIZE;
        return (
          <div
            key={player.username}
            className="absolute rounded-full"
            style={{
              left: x - 3,
              top: y - 3,
              width: player.username === myPlayer?.username ? 8 : 6,
              height: player.username === myPlayer?.username ? 8 : 6,
              background: color,
              boxShadow: `0 0 4px ${color}`,
              zIndex: 2,
            }}
            title={player.username}
          />
        );
      })}

      <div
        className="absolute bottom-0 left-0 right-0 text-center"
        style={{
          fontSize: 9,
          color: "rgba(150,220,80,0.7)",
          padding: "2px 0",
          zIndex: 3,
        }}
      >
        MINI MAP
      </div>
    </button>
  );
}
