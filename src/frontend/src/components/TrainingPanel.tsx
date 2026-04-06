import React, { useState, useEffect } from "react";
import type { HealingEntry, TroopCounts, UpgradeState } from "../types/game";

interface Props {
  troops: TroopCounts;
  trainingInterval: number;
  nextTrainingAt: number;
  healingQueue: HealingEntry[];
  upgrades: UpgradeState;
  onUpgradeTraining: () => void;
  onClose: () => void;
}

export function TrainingPanel({
  troops,
  trainingInterval,
  nextTrainingAt,
  healingQueue,
  upgrades,
  onUpgradeTraining,
  onClose,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const msLeft = Math.max(0, nextTrainingAt - now);
  const progress = Math.min(
    100,
    Math.max(0, ((trainingInterval - msLeft) / trainingInterval) * 100),
  );
  const secsLeft = Math.ceil(msLeft / 1000);
  const minsLeft = Math.floor(secsLeft / 60);
  const sLeft = secsLeft % 60;

  const totalTroops = troops.soldiers + troops.tanks + troops.jets;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="rounded-xl p-5 w-80 max-h-screen overflow-y-auto"
        style={{
          background: "#0a1a05",
          border: "2px solid rgba(125,207,69,0.4)",
          color: "white",
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: "#7DCF45" }}>
            ⚔️ Training Ground
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            data-ocid="training.close_button"
          >
            ×
          </button>
        </div>

        {/* Troop counts */}
        <div
          className="rounded-lg p-3 mb-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: "#aaa" }}>
            🛡️ Army Strength
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">🗡️ Soldiers</span>
            <span className="text-sm font-bold" style={{ color: "#7DCF45" }}>
              {troops.soldiers.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">🛡️ Tanks</span>
            <span className="text-sm font-bold" style={{ color: "#ff9800" }}>
              {troops.tanks.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm">✈️ Jets</span>
            <span className="text-sm font-bold" style={{ color: "#45a8cf" }}>
              {troops.jets.toLocaleString()}
            </span>
          </div>
          <div
            className="flex justify-between pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
          >
            <span className="text-xs" style={{ color: "#aaa" }}>
              Total Forces
            </span>
            <span className="text-xs font-bold" style={{ color: "#fff" }}>
              {totalTroops.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Training progress */}
        <div
          className="rounded-lg p-3 mb-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: "#aaa" }}>
            🎯 Training Progress
          </div>
          <div className="text-xs mb-2" style={{ color: "#ccc" }}>
            Training 100 soldiers in{" "}
            <span style={{ color: "#7DCF45", fontWeight: "bold" }}>
              {minsLeft}m {sLeft}s
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 8, background: "rgba(255,255,255,0.1)" }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #3a8010, #7DCF45)",
                transition: "width 0.5s linear",
              }}
            />
          </div>
          <div className="text-xs mt-1" style={{ color: "#666" }}>
            Speed level: {upgrades.trainingSpeed}
            {upgrades.trainingSpeed < 10 && (
              <button
                type="button"
                onClick={onUpgradeTraining}
                className="ml-2 px-2 py-0.5 rounded text-xs"
                style={{ background: "#1a4010", color: "#7DCF45" }}
                data-ocid="training.secondary_button"
              >
                Upgrade Speed
              </button>
            )}
            {upgrades.trainingSpeed >= 10 && (
              <span
                className="ml-2 px-2 py-0.5 rounded text-xs"
                style={{
                  background: "rgba(255,200,0,0.2)",
                  color: "#ffd700",
                }}
              >
                ★ MAX
              </span>
            )}
          </div>
        </div>

        {/* Healing queue */}
        {healingQueue.length > 0 && (
          <div
            className="rounded-lg p-3"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <div
              className="text-xs font-semibold mb-2"
              style={{ color: "#aaa" }}
            >
              ❤️ Healing Queue
            </div>
            {healingQueue.map((entry, idx) => {
              const healLeft = Math.max(0, entry.completesAt - now);
              const healMins = Math.floor(healLeft / 60000);
              const healSecs = Math.ceil((healLeft % 60000) / 1000);

              return (
                <div
                  key={entry.id}
                  className="mb-2"
                  data-ocid={`training.item.${idx + 1}`}
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "#ccc" }}>
                      🚑 {entry.troops} troops healing
                    </span>
                    <span style={{ color: "#50ee50" }}>
                      {healMins}m {healSecs}s
                    </span>
                  </div>
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{
                      height: 5,
                      background: "rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      style={{
                        width: `${100 - (healLeft / (entry.troops * 600)) * 100}%`,
                        height: "100%",
                        background: "#50ee50",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {healingQueue.length === 0 && (
          <div className="text-xs text-center py-2" style={{ color: "#444" }}>
            No troops healing — all forces are healthy
          </div>
        )}
      </div>
    </div>
  );
}
