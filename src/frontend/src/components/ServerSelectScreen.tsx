import React, { useEffect, useCallback } from "react";

interface ServerInfo {
  name: string;
  playerCount: number;
  isOnline: boolean;
  players: string[];
}

interface Props {
  username: string;
  serverInfos: ServerInfo[];
  onFetchInfos: () => void;
  onJoin: (serverId: number) => void;
}

const SERVER_NAMES = ["Shadowwood", "Ironveil", "Crimsonmoor"];
const SERVER_DESCS = [
  "A dense forest realm shrouded in shadow",
  "Iron fortresses behind an iron veil of mist",
  "Blood-red moors where no mercy exists",
];
const SERVER_ICONS = ["🌲", "⚔️", "🔥"];

export function ServerSelectScreen({
  username,
  serverInfos,
  onFetchInfos,
  onJoin,
}: Props) {
  const fetchInfos = useCallback(() => {
    onFetchInfos();
  }, [onFetchInfos]);

  useEffect(() => {
    fetchInfos();
  }, [fetchInfos]);

  const infos =
    serverInfos.length === 3
      ? serverInfos
      : SERVER_NAMES.map((name) => ({
          name,
          playerCount: 0,
          isOnline: true,
          players: [],
        }));

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse at center, #0d1f05 0%, #050d02 100%)",
      }}
    >
      {/* Dragon Logo */}
      <div
        style={{
          filter:
            "drop-shadow(0 0 28px rgba(160,60,220,0.75)) drop-shadow(0 0 56px rgba(100,200,50,0.3))",
          marginBottom: "1.5rem",
          width: "100%",
          maxWidth: "600px",
        }}
      >
        <img
          src="/assets/generated/sablesoulreaver-dragon-logo.dim_800x400.png"
          alt="SableSoulreaver MMO"
          style={{
            width: "100%",
            display: "block",
          }}
        />
      </div>

      <div className="text-sm mb-6" style={{ color: "#aaa" }}>
        Welcome,{" "}
        <span style={{ color: "#7DCF45", fontWeight: "bold" }}>{username}</span>
        . Choose your server.
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {infos.map((info, i) => (
          <div
            key={SERVER_NAMES[i]}
            className="rounded-xl p-4"
            style={{
              background: "rgba(5,15,2,0.9)",
              border: "1px solid rgba(100,200,50,0.25)",
              boxShadow: "0 0 15px rgba(100,200,50,0.08)",
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{SERVER_ICONS[i]}</span>
                <div>
                  <div className="font-bold" style={{ color: "#7DCF45" }}>
                    Server {i + 1}: {SERVER_NAMES[i]}
                  </div>
                  <div className="text-xs" style={{ color: "#666" }}>
                    {SERVER_DESCS[i]}
                  </div>
                </div>
              </div>
              <div
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: info.isOnline
                    ? "rgba(50,200,50,0.15)"
                    : "rgba(200,50,50,0.15)",
                  color: info.isOnline ? "#4CAF50" : "#F44336",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: info.isOnline ? "#4CAF50" : "#F44336" }}
                />
                {info.isOnline ? "Online" : "Offline"}
              </div>
            </div>

            <div className="flex items-center justify-between mb-1">
              <div className="text-xs" style={{ color: "#aaa" }}>
                👤 {info.playerCount} player{info.playerCount !== 1 ? "s" : ""}{" "}
                online
              </div>
              <button
                type="button"
                onClick={() => onJoin(i + 1)}
                disabled={!info.isOnline}
                data-ocid={`server.item.${i + 1}`}
                className="px-4 py-2 rounded-lg text-sm font-bold"
                style={{
                  background: info.isOnline
                    ? "linear-gradient(135deg, #2a6010, #3a8a18)"
                    : "#333",
                  color: info.isOnline ? "white" : "#666",
                  cursor: info.isOnline ? "pointer" : "not-allowed",
                }}
              >
                {info.isOnline ? "JOIN" : "OFFLINE"}
              </button>
            </div>

            {/* Player list */}
            {info.players.length > 0 && (
              <div
                style={{
                  color: "#666",
                  fontSize: "10px",
                  marginTop: "6px",
                  marginBottom: "2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Players online:
              </div>
            )}
            <div
              style={{
                maxHeight: "160px",
                overflowY: "auto",
                marginTop: "2px",
              }}
            >
              {info.players.length === 0 ? (
                <div style={{ color: "#555", fontSize: "10px" }}>
                  No players online
                </div>
              ) : (
                info.players.map((playerName) => (
                  <div
                    key={playerName}
                    style={{
                      color: "#888",
                      fontSize: "10px",
                      lineHeight: "1.6",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span style={{ color: "#4CAF50", fontSize: "8px" }}>●</span>
                    {playerName}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-xs" style={{ color: "#444" }}>
        SableSoulreaver MMO &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
