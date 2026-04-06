import React, { useState } from "react";
import type { GamePlayer, UpgradeState } from "../types/game";

type UpgradeType = keyof UpgradeState;

interface UpgradeInfo {
  key: UpgradeType;
  label: string;
  emoji: string;
  bonus: (level: number) => string;
}

const UPGRADES: UpgradeInfo[] = [
  {
    key: "baseHp",
    label: "Base HP",
    emoji: "🏅",
    bonus: (l) => `+${l * 10000} max HP`,
  },
  {
    key: "wallHp",
    label: "Wall HP",
    emoji: "🧱",
    bonus: (l) => `+${l * 6000} wall HP`,
  },
  {
    key: "trainingSpeed",
    label: "Training",
    emoji: "⏡",
    bonus: (l) => `${Math.round(300 / l)}s per 100`,
  },
  {
    key: "troopCap",
    label: "Troop Cap",
    emoji: "🗡️",
    bonus: (l) => `${l * 10000} max troops`,
  },
  {
    key: "attackPower",
    label: "Attack",
    emoji: "⚔️",
    bonus: (l) => `${l * 20} damage/hit`,
  },
];

interface Props {
  upgrades: UpgradeState;
  myPlayer: GamePlayer | null;
  onUpgrade: (type: string) => void;
  onClose: () => void;
}

export function UpgradePanel({
  upgrades,
  myPlayer,
  onUpgrade,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<UpgradeType>("baseHp");
  const isSable = myPlayer?.username === "SableSoulreaver";

  const current = UPGRADES.find((u) => u.key === activeTab);
  const currentLevel = upgrades[activeTab];
  const nextLevel = Math.min(10, currentLevel + 1);
  const isMax = currentLevel >= 10;
  const woodCost = currentLevel * 100;
  const stoneCost = currentLevel * 50;
  const foodCost = currentLevel * 75;
  const canAfford =
    isSable ||
    (myPlayer
      ? myPlayer.resources.wood >= woodCost &&
        myPlayer.resources.stone >= stoneCost &&
        myPlayer.resources.food >= foodCost
      : false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="rounded-xl p-5 w-80"
        style={{
          background: "#0a1a05",
          border: "2px solid rgba(125,207,69,0.4)",
          color: "white",
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: "#7DCF45" }}>
            ⬆️ Upgrade Center
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            data-ocid="upgrade.close_button"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {UPGRADES.map((u) => (
            <button
              type="button"
              key={u.key}
              onClick={() => setActiveTab(u.key)}
              className="flex-1 py-1.5 px-1 rounded text-xs font-semibold"
              style={{
                background:
                  activeTab === u.key
                    ? "rgba(125,207,69,0.25)"
                    : "rgba(255,255,255,0.05)",
                border:
                  activeTab === u.key
                    ? "1px solid rgba(125,207,69,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                color: activeTab === u.key ? "#7DCF45" : "#aaa",
              }}
              data-ocid="upgrade.tab"
            >
              {u.emoji}
            </button>
          ))}
        </div>

        {current && (
          <div
            className="rounded-lg p-4"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <div className="text-base font-bold mb-1" style={{ color: "#fff" }}>
              {current.emoji} {current.label}
            </div>

            {/* Level display */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
                  <div
                    key={lvl}
                    style={{
                      width: 16,
                      height: 8,
                      borderRadius: 2,
                      background:
                        lvl <= currentLevel
                          ? isMax && isSable
                            ? "#ffd700"
                            : "#7DCF45"
                          : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>
              {isMax && (
                <span
                  className="text-xs px-2 py-0.5 rounded font-bold"
                  style={{
                    background: "rgba(255,215,0,0.2)",
                    color: "#ffd700",
                    border: "1px solid rgba(255,215,0,0.4)",
                  }}
                >
                  ★ MAX
                </span>
              )}
            </div>

            <div className="text-xs mb-1" style={{ color: "#aaa" }}>
              Current: {current.bonus(currentLevel)}
            </div>
            {!isMax && (
              <div className="text-xs mb-3" style={{ color: "#7DCF45" }}>
                Next (Lv{nextLevel}): {current.bonus(nextLevel)}
              </div>
            )}

            {!isMax && (
              <>
                <div
                  className="text-xs mb-3 p-2 rounded"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                >
                  <div className="font-semibold mb-1" style={{ color: "#aaa" }}>
                    Cost:
                  </div>
                  <div className="flex gap-3">
                    <span
                      style={{
                        color:
                          (myPlayer?.resources.wood || 0) >= woodCost
                            ? "#7DCF45"
                            : "#ff4444",
                      }}
                    >
                      🌲 {woodCost}
                    </span>
                    <span
                      style={{
                        color:
                          (myPlayer?.resources.stone || 0) >= stoneCost
                            ? "#aaa"
                            : "#ff4444",
                      }}
                    >
                      🪄 {stoneCost}
                    </span>
                    <span
                      style={{
                        color:
                          (myPlayer?.resources.food || 0) >= foodCost
                            ? "#ffeb3b"
                            : "#ff4444",
                      }}
                    >
                      🌾 {foodCost}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpgrade(activeTab)}
                  disabled={!canAfford}
                  className="w-full py-2 rounded-lg text-sm font-bold"
                  style={{
                    background: canAfford ? "#2a6010" : "#333",
                    color: canAfford ? "white" : "#666",
                    cursor: canAfford ? "pointer" : "not-allowed",
                  }}
                  data-ocid="upgrade.primary_button"
                >
                  Upgrade to Level {nextLevel}
                </button>
              </>
            )}
            {isMax && (
              <div
                className="text-center text-xs py-2"
                style={{ color: "#ffd700" }}
              >
                ★ Fully Upgraded! Maximum power achieved.
              </div>
            )}
          </div>
        )}

        {/* Resource summary */}
        {myPlayer && (
          <div className="mt-3 flex justify-between text-xs">
            <span style={{ color: "#7DCF45" }}>
              🌲 {myPlayer.resources.wood.toLocaleString()}
            </span>
            <span style={{ color: "#aaa" }}>
              🪄 {myPlayer.resources.stone.toLocaleString()}
            </span>
            <span style={{ color: "#ffeb3b" }}>
              🌾 {myPlayer.resources.food.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
