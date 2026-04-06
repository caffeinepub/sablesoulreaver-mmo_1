import React, { useState, useEffect } from "react";
import type { GamePlayer, UpgradeState } from "../types/game";

interface Props {
  username: string;
  players: GamePlayer[];
  serverId: number;
  myPlayer: GamePlayer | null;
  myShieldActive: boolean;
  shieldCooldownUntil: number;
  upgrades: UpgradeState;
  onBroadcast: (msg: string) => void;
  onInitResources: () => void;
  onToggleShield: (active: boolean) => void;
  onKickAndNuke: (username: string, x: number, y: number) => void;
  onBanPlayer: (username: string) => void;
  onClose: () => void;
}

export function AdminPanel({
  username,
  players,
  serverId,
  myPlayer,
  myShieldActive,
  shieldCooldownUntil,
  upgrades,
  onBroadcast,
  onInitResources,
  onToggleShield,
  onKickAndNuke,
  onBanPlayer,
  onClose,
}: Props) {
  const [broadcast, setBroadcast] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const shieldOnCooldown = shieldCooldownUntil > now;
  const cooldownSecs = Math.max(
    0,
    Math.ceil((shieldCooldownUntil - now) / 1000),
  );
  const cooldownMins = Math.floor(cooldownSecs / 60);
  const cooldownRemSecs = cooldownSecs % 60;

  const troops = myPlayer?.troops;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="rounded-xl p-5 w-80 max-h-screen overflow-y-auto"
        style={{
          background: "#0a1a05",
          border: "2px solid #5a1a1a",
          color: "white",
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: "#ffd700" }}>
            👑 SableSoulreaver Control Panel
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            data-ocid="admin.close_button"
          >
            ×
          </button>
        </div>

        {/* Access check */}
        {username.toLowerCase() !== "sablesoulreaver" ? (
          <div
            className="rounded-lg p-4 text-center mb-4"
            style={{
              background: "rgba(100,0,0,0.3)",
              border: "1px solid rgba(200,50,50,0.5)",
            }}
          >
            <div className="text-3xl mb-2">⛔</div>
            <div className="text-sm font-bold" style={{ color: "#ff6644" }}>
              Access Denied
            </div>
            <div className="text-xs mt-1" style={{ color: "#aaa" }}>
              This control panel is reserved for SableSoulreaver.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full py-2 rounded text-sm"
              style={{ background: "rgba(255,255,255,0.1)", color: "#aaa" }}
            >
              Close
            </button>
          </div>
        ) : null}

        {username.toLowerCase() === "sablesoulreaver" && (
          <>
            {/* SableSoulreaver Controls */}
            <div
              className="mb-4 rounded-lg p-3"
              style={{
                background: "rgba(255,215,0,0.05)",
                border: "1px solid rgba(255,215,0,0.25)",
              }}
            >
              <div
                className="text-sm font-bold mb-3 flex items-center gap-2"
                style={{ color: "#ffd700" }}
              >
                👑 {username} Controls
              </div>

              {/* Shield toggle */}
              <div className="mb-3">
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: "#aaa" }}
                >
                  🛡️ Base Shield
                </div>
                {shieldOnCooldown ? (
                  <div
                    className="text-xs px-3 py-2 rounded"
                    style={{
                      background: "rgba(255,100,0,0.15)",
                      color: "#ff8844",
                    }}
                  >
                    ⏳ Cooldown: {cooldownMins}m {cooldownRemSecs}s remaining
                    (Boss defeated)
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleShield(true)}
                      className="flex-1 py-2 rounded-lg text-sm font-bold"
                      style={{
                        background: myShieldActive
                          ? "rgba(0,150,255,0.4)"
                          : "rgba(0,100,200,0.2)",
                        border: myShieldActive
                          ? "2px solid #0099ff"
                          : "1px solid rgba(0,100,200,0.3)",
                        color: myShieldActive ? "#55ccff" : "#aaa",
                      }}
                      data-ocid="admin.toggle"
                    >
                      🛡️ ON
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleShield(false)}
                      className="flex-1 py-2 rounded-lg text-sm font-bold"
                      style={{
                        background: !myShieldActive
                          ? "rgba(200,50,50,0.35)"
                          : "rgba(200,50,50,0.1)",
                        border: !myShieldActive
                          ? "2px solid #cc3333"
                          : "1px solid rgba(200,50,50,0.2)",
                        color: !myShieldActive ? "#ff8888" : "#aaa",
                      }}
                      data-ocid="admin.toggle"
                    >
                      ❌ OFF
                    </button>
                  </div>
                )}
              </div>

              {/* HP info */}
              {myPlayer && (
                <div className="mb-3">
                  <div
                    className="text-xs font-semibold mb-1"
                    style={{ color: "#aaa" }}
                  >
                    🏅 Base & Wall HP
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span style={{ color: "#4CAF50" }}>
                      Base: {myPlayer.hp.toLocaleString()} /{" "}
                      {(myPlayer.maxBaseHp || myPlayer.maxHp).toLocaleString()}
                    </span>
                    <span style={{ color: "#4488ff" }}>
                      Wall: {(myPlayer.wallHp || 0).toLocaleString()} /{" "}
                      {(myPlayer.maxWallHp || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Troop counts */}
              {troops && (
                <div className="mb-3">
                  <div
                    className="text-xs font-semibold mb-1"
                    style={{ color: "#aaa" }}
                  >
                    🛡️ Army
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span style={{ color: "#7DCF45" }}>
                      🗡️ {troops.soldiers.toLocaleString()}
                    </span>
                    <span style={{ color: "#ff9800" }}>
                      🛡️ {troops.tanks.toLocaleString()}
                    </span>
                    <span style={{ color: "#45a8cf" }}>
                      ✈️ {troops.jets.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Upgrade levels */}
              <div>
                <div
                  className="text-xs font-semibold mb-1"
                  style={{ color: "#aaa" }}
                >
                  ⬆️ Upgrade Levels
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(Object.entries(upgrades) as [string, number][]).map(
                    ([key, val]) => (
                      <span
                        key={key}
                        className="px-2 py-0.5 rounded"
                        style={{
                          background:
                            val >= 10
                              ? "rgba(255,215,0,0.2)"
                              : "rgba(255,255,255,0.08)",
                          color: val >= 10 ? "#ffd700" : "#ccc",
                        }}
                      >
                        {key}: {val >= 10 ? "★MAX" : val}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Online players with kick+nuke */}
            <div className="mb-4">
              <div
                className="text-sm font-semibold mb-2"
                style={{ color: "#aaa" }}
              >
                Server {serverId} Online Players ({players.length})
              </div>
              <div className="max-h-48 overflow-y-auto">
                {players.length === 0 ? (
                  <div className="text-xs text-gray-500">No players online</div>
                ) : (
                  players.map((p) => (
                    <div
                      key={p.username}
                      className="flex justify-between items-center text-xs py-1.5"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <div>
                        <span>{p.username}</span>
                        <span className="ml-2" style={{ color: "#aaa" }}>
                          HP: {p.hp}
                        </span>
                      </div>
                      {p.username !== username && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `🚫 Ban ${p.username}? This will permanently remove them from the server!`,
                                )
                              ) {
                                onBanPlayer(p.username);
                              }
                            }}
                            className="px-2 py-1 rounded text-xs font-bold flex-shrink-0"
                            style={{
                              background: "rgba(120,0,150,0.3)",
                              border: "1px solid rgba(180,50,220,0.5)",
                              color: "#cc88ff",
                            }}
                            data-ocid="admin.ban_button"
                          >
                            🚫 Ban
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `☢️ Kick & NUKE ${p.username}? This will remove them from the server and launch a nuclear strike on their base!`,
                                )
                              ) {
                                onKickAndNuke(p.username, p.posX, p.posY);
                              }
                            }}
                            className="px-2 py-1 rounded text-xs font-bold flex-shrink-0"
                            style={{
                              background: "rgba(200,0,0,0.3)",
                              border: "1px solid rgba(255,50,50,0.5)",
                              color: "#ff6666",
                            }}
                            data-ocid="admin.delete_button"
                          >
                            ☢️ Kick
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Broadcast */}
            <div className="mb-4">
              <div
                className="text-sm font-semibold mb-2"
                style={{ color: "#aaa" }}
              >
                Broadcast Message
              </div>
              <textarea
                className="w-full text-xs p-2 rounded"
                rows={3}
                placeholder="Type broadcast..."
                value={broadcast}
                onChange={(e) => setBroadcast(e.target.value)}
                data-ocid="admin.textarea"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  onBroadcast(broadcast);
                  setBroadcast("");
                }}
                className="w-full mt-1 py-1 rounded text-sm font-bold"
                style={{ background: "#5a1a1a", color: "white" }}
                data-ocid="admin.submit_button"
              >
                Broadcast
              </button>
            </div>

            <button
              type="button"
              onClick={onInitResources}
              className="w-full py-2 rounded text-sm font-bold mb-2"
              style={{ background: "#1a3a10", color: "#7DCF45" }}
              data-ocid="admin.secondary_button"
            >
              Re-Initialize Resources
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded text-sm"
              style={{ background: "rgba(255,255,255,0.1)", color: "#aaa" }}
            >
              Close Panel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
