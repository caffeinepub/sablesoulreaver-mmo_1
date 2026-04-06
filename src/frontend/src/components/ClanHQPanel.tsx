import React, { useState, useEffect } from "react";
import type { ClanUpgrades, LocalClan } from "../types/game";

interface Props {
  clan: LocalClan;
  username: string;
  onClose: () => void;
  onTeleportHQ: (x: number, y: number) => boolean;
  onSpendPoints: (upgradeKey: keyof ClanUpgrades, cost: number) => void;
  onChangeMemberRank: (
    clanId: string,
    targetUsername: string,
    rank: string,
  ) => void;
  onKickMember: (clanId: string, member: string) => void;
  onBuildHQ?: (x: number, y: number) => void;
  hasClanDragon?: boolean;
  hqShieldActive?: boolean;
  dragonModeActive?: boolean;
  onToggleDragonMode?: () => void;
  onDonateGold?: (amount: number) => boolean;
  myGold?: number;
  onLaunchAtomBomb?: (targetPlayerId: string) => boolean;
  allPlayers?: Array<{ id: string; username: string }>;
  clans?: LocalClan[];
}

const RANKS = ["Recruit", "Soldier", "Officer", "Commander", "Elder"];
const UPGRADE_COSTS: Record<keyof ClanUpgrades, number> = {
  defenseBonus: 2000,
  attackBonus: 2000,
  trainingBonus: 1500,
  troopCap: 2000,
};

export function ClanHQPanel({
  clan,
  username,
  onClose,
  onTeleportHQ,
  onSpendPoints,
  onChangeMemberRank,
  onKickMember,
  hasClanDragon,
  hqShieldActive,
  dragonModeActive,
  onToggleDragonMode,
  onDonateGold,
  myGold = 0,
  onLaunchAtomBomb,
  allPlayers = [],
  clans = [],
}: Props) {
  const [tab, setTab] = useState<"info" | "upgrades" | "members" | "teleport">(
    "info",
  );
  const [teleportX, setTeleportX] = useState("");
  const [teleportY, setTeleportY] = useState("");
  const [rankTarget, setRankTarget] = useState<string | null>(null);
  const [donateAmount, setDonateAmount] = useState("");
  const [atomBombTarget, setAtomBombTarget] = useState("");
  const [showAtomConfirm, setShowAtomConfirm] = useState(false);
  const [atomBombCountdown, setAtomBombCountdown] = useState("");

  const isOwner = clan.leaderUsername === username;
  const isMember = clan.memberUsernames.includes(username);
  const today = Math.floor(Date.now() / 86400000);
  const teleportsUsed =
    (clan.hqLastTeleportDay || 0) === today ? clan.hqTeleportsToday || 0 : 0;
  const teleportsLeft = 2 - teleportsUsed;

  const hqHp = clan.hqHp || 0;
  const hqWallHp = clan.hqWallHp || 0;

  // Atom bomb cooldown countdown
  const ATOM_BOMB_COOLDOWN = 4 * 24 * 60 * 60 * 1000;
  const atomBombLastUsed = clan.atomBombLastUsed ?? 0;
  const atomBombOnCooldown =
    atomBombLastUsed > 0 && Date.now() - atomBombLastUsed < ATOM_BOMB_COOLDOWN;

  useEffect(() => {
    if (!atomBombOnCooldown) {
      setAtomBombCountdown("");
      return;
    }
    const tick = () => {
      const remaining = ATOM_BOMB_COOLDOWN - (Date.now() - atomBombLastUsed);
      if (remaining <= 0) {
        setAtomBombCountdown("");
        return;
      }
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (mins > 0) parts.push(`${mins}m`);
      parts.push(`${secs}s`);
      setAtomBombCountdown(parts.join(" "));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [atomBombOnCooldown, atomBombLastUsed]);
  const points = clan.clanPoints || 0;
  const upgrades: ClanUpgrades = clan.clanUpgrades || {
    defenseBonus: 0,
    attackBonus: 0,
    trainingBonus: 0,
    troopCap: 0,
  };

  if (!isMember) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)" }}
        data-ocid="clanhq.modal"
      >
        <div
          className="rounded-xl p-5 w-72"
          style={{ background: "#0a1a05", border: `2px solid ${clan.color}` }}
        >
          <h3
            className="text-base font-bold mb-2"
            style={{ color: clan.color }}
          >
            {clan.name} HQ
          </h3>
          <p className="text-sm mb-4" style={{ color: "#aaa" }}>
            Members only area.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg text-sm"
            style={{ background: "rgba(255,255,255,0.1)", color: "#aaa" }}
            data-ocid="clanhq.close_button"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    "info",
    "upgrades",
    "members",
    ...(isOwner ? ["teleport"] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      data-ocid="clanhq.modal"
    >
      <div
        className="rounded-xl w-80 max-h-screen overflow-y-auto"
        style={{ background: "#0a1205", border: `2px solid ${clan.color}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${clan.color}44` }}
        >
          <div>
            <div className="font-bold text-sm" style={{ color: clan.color }}>
              🏰 {clan.name} HQ
            </div>
            <div className="text-xs" style={{ color: "#888" }}>
              {clan.memberUsernames.length} members &bull;{" "}
              {points.toLocaleString()} pts
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 text-xl"
            data-ocid="clanhq.close_button"
          >
            ×
          </button>
        </div>

        {/* HP bars */}
        <div className="px-4 py-2">
          <div
            className="flex justify-between text-xs mb-1"
            style={{ color: "#5599ff" }}
          >
            <span>Wall HP</span>
            <span>{hqWallHp.toLocaleString()} / 100,000</span>
          </div>
          <div
            className="w-full rounded-full mb-2"
            style={{ height: 6, background: "rgba(255,255,255,0.1)" }}
          >
            <div
              style={{
                width: `${(hqWallHp / 100000) * 100}%`,
                height: "100%",
                background: "#3366cc",
                borderRadius: "9999px",
                transition: "width 0.3s",
              }}
            />
          </div>
          <div
            className="flex justify-between text-xs mb-1"
            style={{ color: "#55ee55" }}
          >
            <span>Base HP</span>
            <span>{hqHp.toLocaleString()} / 100,000</span>
          </div>
          <div
            className="w-full rounded-full"
            style={{ height: 6, background: "rgba(255,255,255,0.1)" }}
          >
            <div
              style={{
                width: `${(hqHp / 100000) * 100}%`,
                height: "100%",
                background: clan.color,
                borderRadius: "9999px",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>

        {/* Dragon Mode Toggle */}
        {hasClanDragon && !hqShieldActive && (
          <div
            style={{
              margin: "12px 16px 0",
              padding: "10px",
              borderRadius: "8px",
              background: dragonModeActive
                ? "rgba(120,0,180,0.3)"
                : "rgba(60,0,80,0.2)",
              border: dragonModeActive
                ? "2px solid #cc44ff"
                : "1px solid #7700aa",
            }}
          >
            <div style={{ color: "#cc88ff", fontSize: 12, marginBottom: 6 }}>
              🛡 HQ Shield is DOWN — Dragon can be activated!
            </div>
            <button
              type="button"
              onClick={onToggleDragonMode}
              data-ocid="clanhq.toggle"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 6,
                fontWeight: "bold",
                fontSize: 13,
                cursor: "pointer",
                background: dragonModeActive
                  ? "linear-gradient(135deg,#7700cc,#cc00ff)"
                  : "rgba(80,0,120,0.5)",
                color: "#fff",
                border: dragonModeActive
                  ? "2px solid #ff88ff"
                  : "1px solid #9900cc",
                boxShadow: dragonModeActive
                  ? "0 0 16px #cc44ff, 0 0 32px #aa00ff"
                  : "none",
              }}
            >
              {dragonModeActive
                ? "🐉 Dragon Mode: ACTIVE — Tap to Deactivate"
                : "🐉 Activate Dragon Mode"}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex px-4 pb-1 gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t as typeof tab)}
              className="flex-1 py-1 rounded text-xs capitalize"
              style={{
                background:
                  tab === t ? `${clan.color}33` : "rgba(255,255,255,0.05)",
                color: tab === t ? clan.color : "#888",
                border:
                  tab === t
                    ? `1px solid ${clan.color}55`
                    : "1px solid transparent",
              }}
              data-ocid="clanhq.tab"
            >
              {t}
            </button>
          ))}
        </div>

        <div className="px-4 pb-4 pt-2">
          {/* Info tab */}
          {tab === "info" && (
            <div>
              {clan.motd && (
                <div className="text-xs italic mb-2" style={{ color: "#888" }}>
                  &quot;{clan.motd}&quot;
                </div>
              )}
              <div className="text-xs mb-2" style={{ color: "#aaa" }}>
                <span style={{ color: "#ffd700" }}>👑 Leader:</span>{" "}
                {clan.leaderUsername}
              </div>
              <div className="text-xs mb-2" style={{ color: "#aaa" }}>
                🛡 Armor: Lv{upgrades.defenseBonus} (+
                {(upgrades.defenseBonus || 0) * 5}%) | ⚔ Atk: Lv
                {upgrades.attackBonus} (+{(upgrades.attackBonus || 0) * 5}%) |{" "}
                🎯 Trn: Lv{upgrades.trainingBonus} | 👥 Cap: Lv
                {upgrades.troopCap}
              </div>
              {isOwner && (
                <div
                  className="text-xs"
                  style={{ color: teleportsLeft > 0 ? "#66bbff" : "#555" }}
                >
                  🌀 HQ Teleports: {teleportsLeft}/2 remaining today
                </div>
              )}
            </div>
          )}

          {/* Gold Donation for HQ Points */}
          {onDonateGold && (
            <div
              className="mt-3 p-2 rounded-lg"
              style={{
                background: "rgba(255,215,0,0.08)",
                border: "1px solid rgba(255,215,0,0.3)",
              }}
            >
              <div
                className="text-xs font-bold mb-1"
                style={{ color: "#ffd700" }}
              >
                💰 Donate Gold for HQ Points
              </div>
              <div className="text-xs mb-2" style={{ color: "#aaa" }}>
                Rate: 100 gold = 1 HQ point | Your gold:{" "}
                {myGold.toLocaleString()}
              </div>
              <div className="flex gap-1 mb-1">
                {[500, 1000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDonateAmount(String(amt))}
                    className="flex-1 py-1 rounded text-xs"
                    style={{
                      background: "rgba(255,215,0,0.15)",
                      color: "#ffd700",
                      border: "1px solid rgba(255,215,0,0.3)",
                    }}
                  >
                    {amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={donateAmount}
                  onChange={(e) => setDonateAmount(e.target.value)}
                  placeholder="Custom amount"
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    color: "#fff",
                    border: "1px solid rgba(255,215,0,0.3)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const amt = Number.parseInt(donateAmount);
                    if (!amt || amt <= 0) return;
                    const ok = onDonateGold(amt);
                    if (ok) {
                      setDonateAmount("");
                    }
                  }}
                  className="px-3 py-1 rounded text-xs font-bold"
                  style={{
                    background:
                      donateAmount &&
                      Number.parseInt(donateAmount) > 0 &&
                      Number.parseInt(donateAmount) <= myGold
                        ? "#b8860b"
                        : "#444",
                    color:
                      donateAmount &&
                      Number.parseInt(donateAmount) > 0 &&
                      Number.parseInt(donateAmount) <= myGold
                        ? "#fff"
                        : "#888",
                  }}
                >
                  Donate
                </button>
              </div>
              {donateAmount && Number.parseInt(donateAmount) > 0 && (
                <div className="text-xs mt-1" style={{ color: "#aaa" }}>
                  +{Math.floor(Number.parseInt(donateAmount) / 100)} HQ points
                </div>
              )}
            </div>
          )}

          {/* Upgrades tab */}
          {tab === "upgrades" && (
            <div>
              <div className="text-xs mb-1" style={{ color: "#ffd700" }}>
                💰 {points.toLocaleString()} clan points
              </div>
              <div className="text-xs mb-3" style={{ color: "#888" }}>
                🏰 Armor &amp; Attack upgrades apply to ALL clan members in
                battle
              </div>
              {[
                {
                  key: "defenseBonus" as keyof ClanUpgrades,
                  label: "🛡 Armor Upgrade",
                  cost: UPGRADE_COSTS.defenseBonus,
                  description: "Reduces incoming damage for all members",
                },
                {
                  key: "attackBonus" as keyof ClanUpgrades,
                  label: "⚔ Attack Upgrade",
                  cost: UPGRADE_COSTS.attackBonus,
                  description: "Boosts outgoing attack for all members",
                },
                {
                  key: "trainingBonus" as keyof ClanUpgrades,
                  label: "🎯 Training Speed",
                  cost: UPGRADE_COSTS.trainingBonus,
                  description: "Faster troop training for all members",
                },
                {
                  key: "troopCap" as keyof ClanUpgrades,
                  label: "👥 Troop Capacity",
                  cost: UPGRADE_COSTS.troopCap,
                  description: "Increases max troop capacity",
                },
              ].map(({ key, label, cost, description }) => {
                const level = upgrades[key] || 0;
                const MAX_LEVEL = 25;
                // Cost scales with level: base cost * (level + 1) for progressive pricing
                const scaledCost = cost * (level + 1);
                const canAfford = points >= scaledCost && level < MAX_LEVEL;
                const pct = level * 5;
                const isArmorOrAtk =
                  key === "defenseBonus" || key === "attackBonus";
                return (
                  <div
                    key={key}
                    className="mb-3 py-2"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-2">
                        <div
                          className="text-xs font-semibold"
                          style={{ color: "#ccc" }}
                        >
                          {label}
                        </div>
                        {isArmorOrAtk && (
                          <div
                            className="text-xs font-bold mt-0.5"
                            style={{
                              color:
                                key === "defenseBonus" ? "#5599ff" : "#ff9944",
                            }}
                          >
                            Level {level} (+{pct}% to all clan members)
                          </div>
                        )}
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "#555" }}
                        >
                          {description}
                        </div>
                        <div
                          className="flex flex-wrap gap-0.5 mt-1"
                          style={{ maxWidth: 200 }}
                        >
                          {Array.from({ length: MAX_LEVEL }, (_, i) => i).map(
                            (i) => (
                              <div
                                key={`upgrade-pip-${key}-${i}`}
                                style={{
                                  width: 7,
                                  height: 5,
                                  borderRadius: 1,
                                  background:
                                    i < level
                                      ? key === "defenseBonus"
                                        ? "#5599ff"
                                        : key === "attackBonus"
                                          ? "#ff8844"
                                          : "#88cc44"
                                      : "rgba(255,255,255,0.1)",
                                }}
                              />
                            ),
                          )}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "#666" }}
                        >
                          Lv {level}/{MAX_LEVEL}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          canAfford && onSpendPoints(key, scaledCost)
                        }
                        className="text-xs px-2 py-1 rounded flex-shrink-0"
                        style={{
                          background: canAfford
                            ? `${clan.color}33`
                            : "rgba(255,255,255,0.05)",
                          color: canAfford ? clan.color : "#444",
                          border: `1px solid ${
                            canAfford ? `${clan.color}55` : "transparent"
                          }`,
                          cursor: canAfford ? "pointer" : "not-allowed",
                        }}
                        data-ocid="clanhq.button"
                      >
                        {level >= MAX_LEVEL
                          ? "MAX"
                          : `${scaledCost.toLocaleString()} pts`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Members tab */}
          {tab === "members" && (
            <div>
              {clan.memberUsernames.map((member) => {
                const rank =
                  clan.memberRanks?.[member] ||
                  (member === clan.leaderUsername ? "Leader" : "Recruit");
                return (
                  <div
                    key={member}
                    className="py-2"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color:
                              member === clan.leaderUsername
                                ? "#ffd700"
                                : "#ccc",
                          }}
                        >
                          {member === clan.leaderUsername ? "👑 " : ""}
                          {member}
                          {member === username ? " (you)" : ""}
                        </span>
                        <div className="text-xs" style={{ color: "#666" }}>
                          {rank}
                        </div>
                      </div>
                      {isOwner && member !== username && (
                        <div className="flex gap-1">
                          {rankTarget === member ? (
                            <select
                              className="text-xs rounded px-1"
                              style={{
                                background: "#111",
                                color: "#ccc",
                                border: "1px solid #333",
                              }}
                              defaultValue={rank}
                              onChange={(e) => {
                                onChangeMemberRank(
                                  clan.id,
                                  member,
                                  e.target.value,
                                );
                                setRankTarget(null);
                              }}
                              data-ocid="clanhq.select"
                            >
                              {RANKS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setRankTarget(member)}
                                className="text-xs px-1 py-0.5 rounded"
                                style={{
                                  background: "rgba(255,215,0,0.1)",
                                  color: "#ffd700",
                                }}
                                data-ocid="clanhq.button"
                              >
                                Rank
                              </button>
                              <button
                                type="button"
                                onClick={() => onKickMember(clan.id, member)}
                                className="text-xs px-1 py-0.5 rounded"
                                style={{
                                  background: "rgba(200,50,50,0.15)",
                                  color: "#ff8888",
                                }}
                                data-ocid="clanhq.delete_button"
                              >
                                ❌
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Teleport tab (owner only) */}
          {tab === "teleport" && isOwner && (
            <div>
              <div className="text-xs mb-3" style={{ color: "#66bbff" }}>
                🌀 Teleport HQ to new location ({teleportsLeft}/2 remaining
                today)
              </div>
              <div className="mb-2">
                <label
                  htmlFor="hq-teleport-x"
                  className="text-xs block mb-1"
                  style={{ color: "#888" }}
                >
                  Map X (50–950)
                </label>
                <input
                  id="hq-teleport-x"
                  type="number"
                  min={50}
                  max={950}
                  value={teleportX}
                  onChange={(e) => setTeleportX(e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded"
                  placeholder="X coordinate"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(100,200,255,0.3)",
                    color: "white",
                    outline: "none",
                  }}
                  data-ocid="clanhq.input"
                />
              </div>
              <div className="mb-3">
                <label
                  htmlFor="hq-teleport-y"
                  className="text-xs block mb-1"
                  style={{ color: "#888" }}
                >
                  Map Y (50–950)
                </label>
                <input
                  id="hq-teleport-y"
                  type="number"
                  min={50}
                  max={950}
                  value={teleportY}
                  onChange={(e) => setTeleportY(e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded"
                  placeholder="Y coordinate"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(100,200,255,0.3)",
                    color: "white",
                    outline: "none",
                  }}
                  data-ocid="clanhq.input"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const x = Math.min(950, Math.max(50, Number(teleportX)));
                  const y = Math.min(950, Math.max(50, Number(teleportY)));
                  if (x && y && teleportsLeft > 0) {
                    const ok = onTeleportHQ(x, y);
                    if (ok) {
                      setTeleportX("");
                      setTeleportY("");
                    }
                  }
                }}
                className="w-full py-2 rounded-lg text-sm font-bold"
                style={{
                  background: teleportsLeft > 0 ? "#1a2a5a" : "#111",
                  color: teleportsLeft > 0 ? "#66bbff" : "#444",
                }}
                data-ocid="clanhq.primary_button"
              >
                {teleportsLeft > 0
                  ? "🌀 Teleport HQ"
                  : "No teleports left today"}
              </button>
            </div>
          )}
        </div>

        {/* ☢️ Atom Bomb Section — clan leader only */}
        {isOwner && onLaunchAtomBomb && (
          <div
            className="mt-3 p-3 rounded-lg"
            style={{
              background: "rgba(120,0,0,0.25)",
              border: "2px solid rgba(255,50,0,0.5)",
            }}
          >
            <div
              className="text-xs font-bold mb-1 flex items-center gap-1"
              style={{ color: "#ff4422" }}
            >
              ☢️ Atom Bomb
              <span
                className="ml-auto text-xs font-normal"
                style={{ color: "#ff8866" }}
              >
                Charges: {2 - (clan.atomBombsUsed ?? 0)}/2
              </span>
            </div>
            {atomBombOnCooldown ? (
              <div
                className="p-2 rounded text-xs"
                style={{
                  background: "rgba(40,0,0,0.5)",
                  border: "1px solid rgba(180,40,0,0.4)",
                }}
                data-ocid="clanhq.loading_state"
              >
                <div style={{ color: "#ff8855", marginBottom: 4 }}>
                  ⏳ Cooldown Active
                </div>
                <div
                  style={{
                    color: "#ffaa77",
                    fontFamily: "monospace",
                    fontSize: 13,
                    fontWeight: "bold",
                  }}
                >
                  Next launch in: {atomBombCountdown}
                </div>
                {(clan.atomBombsUsed ?? 0) >= 2 && (
                  <div style={{ color: "#664444", marginTop: 4 }}>
                    No charges remaining (0/2)
                  </div>
                )}
              </div>
            ) : (clan.atomBombsUsed ?? 0) < 2 ? (
              <div>
                <div className="text-xs mb-2" style={{ color: "#ff9977" }}>
                  Deal 50,000 damage. Bypasses all shields. Tracks player even
                  through teleports.
                  <br />
                  <span style={{ color: "#ffaa66" }}>
                    4-day cooldown after launch.
                  </span>
                </div>
                <select
                  value={atomBombTarget}
                  onChange={(e) => setAtomBombTarget(e.target.value)}
                  className="w-full px-2 py-1 rounded text-xs mb-2"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                    border: "1px solid rgba(255,80,0,0.5)",
                  }}
                  data-ocid="clanhq.select"
                >
                  <option value="">— Select clan leader to target —</option>
                  {clans
                    .filter(
                      (c) =>
                        c.leaderUsername !== username &&
                        !c.leaderUsername.startsWith("Unspeaken_"),
                    )
                    .map((c) => {
                      const leaderPlayer = allPlayers.find(
                        (p) => p.username === c.leaderUsername,
                      );
                      const targetId = leaderPlayer
                        ? leaderPlayer.id
                        : c.leaderUsername;
                      return (
                        <option key={c.id} value={targetId}>
                          {c.leaderUsername} — [{c.name}]
                        </option>
                      );
                    })}
                </select>
                {showAtomConfirm && atomBombTarget ? (
                  <div
                    className="p-2 rounded text-xs mb-1"
                    style={{
                      background: "rgba(80,0,0,0.5)",
                      border: "1px solid #ff4422",
                    }}
                  >
                    <div style={{ color: "#ffccaa", marginBottom: 6 }}>
                      ⚠️ Launch Atom Bomb at{" "}
                      <strong style={{ color: "#ff6644" }}>
                        {allPlayers.find((p) => p.id === atomBombTarget)
                          ?.username ??
                          clans.find((c) => c.leaderUsername === atomBombTarget)
                            ?.leaderUsername ??
                          atomBombTarget}
                      </strong>
                      ?
                      <br />
                      Deals 50,000 damage. Uses 1 charge. 4-day cooldown starts.
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const ok = onLaunchAtomBomb(atomBombTarget);
                          if (ok) {
                            setAtomBombTarget("");
                            setShowAtomConfirm(false);
                          }
                        }}
                        className="flex-1 py-1 rounded text-xs font-bold"
                        style={{
                          background: "#aa1100",
                          color: "#fff",
                          border: "1px solid #ff4422",
                        }}
                        data-ocid="clanhq.confirm_button"
                      >
                        ☢️ LAUNCH
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAtomConfirm(false)}
                        className="flex-1 py-1 rounded text-xs"
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          color: "#aaa",
                        }}
                        data-ocid="clanhq.cancel_button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!atomBombTarget) return;
                      setShowAtomConfirm(true);
                    }}
                    className="w-full py-1.5 rounded text-xs font-bold"
                    style={{
                      background: atomBombTarget
                        ? "linear-gradient(135deg,#880000,#cc2200)"
                        : "rgba(80,0,0,0.3)",
                      color: atomBombTarget ? "#fff" : "#666",
                      border: atomBombTarget
                        ? "1px solid #ff4422"
                        : "1px solid #440000",
                      cursor: atomBombTarget ? "pointer" : "not-allowed",
                    }}
                    data-ocid="clanhq.delete_button"
                  >
                    ☢️ Launch Atom Bomb
                  </button>
                )}
              </div>
            ) : (
              <div
                className="text-xs py-1"
                style={{ color: "#664444" }}
                data-ocid="clanhq.error_state"
              >
                ☢️ Atom Bomb — No charges remaining (0/2)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
