import React, { useState, useMemo } from "react";
import type { LocalClan, TerritoryCell } from "../types/game";

interface Props {
  territory: TerritoryCell[];
  clans: LocalClan[];
}

export function TerritoryLeaderboard({ territory, clans }: Props) {
  const [open, setOpen] = useState(true);

  const ranked = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cell of territory) {
      counts[cell.clanId] = (counts[cell.clanId] || 0) + 1;
    }
    return clans
      .filter((c) => (counts[c.id] || 0) > 0)
      .map((c) => ({ clan: c, tiles: counts[c.id] || 0 }))
      .sort((a, b) => b.tiles - a.tiles)
      .slice(0, 10);
  }, [territory, clans]);

  return (
    <div
      data-ocid="leaderboard.panel"
      style={{
        position: "fixed",
        top: 80,
        right: 12,
        zIndex: 50,
        minWidth: 160,
        maxWidth: 200,
        background: "rgba(10,8,5,0.88)",
        border: "1px solid rgba(180,140,60,0.45)",
        borderRadius: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.7), 0 0 8px rgba(180,140,60,0.1)",
        fontFamily: "'Figtree', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        type="button"
        data-ocid="leaderboard.toggle"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          background: "rgba(180,140,60,0.15)",
          border: "none",
          cursor: "pointer",
          color: "#E8C870",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        <span>🏆 Territory</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: "6px 0 8px" }}>
          {ranked.length === 0 ? (
            <div
              data-ocid="leaderboard.empty_state"
              style={{
                color: "rgba(200,180,120,0.5)",
                fontSize: 11,
                padding: "4px 12px",
                textAlign: "center",
              }}
            >
              No territory claimed
            </div>
          ) : (
            ranked.map(({ clan, tiles }, i) => (
              <div
                key={clan.id}
                data-ocid={`leaderboard.item.${i + 1}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "3px 10px",
                  background: i === 0 ? "rgba(220,180,60,0.08)" : "transparent",
                  borderLeft:
                    i === 0
                      ? `2px solid ${clan.color}`
                      : "2px solid transparent",
                }}
              >
                {/* Rank */}
                <span
                  style={{
                    color:
                      i === 0
                        ? "#FFD700"
                        : i === 1
                          ? "#C0C0C0"
                          : i === 2
                            ? "#CD7F32"
                            : "rgba(200,180,120,0.5)",
                    fontSize: 10,
                    fontWeight: 800,
                    minWidth: 14,
                    textAlign: "right",
                  }}
                >
                  {i + 1}
                </span>
                {/* Color swatch */}
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: clan.color,
                    boxShadow: `0 0 4px ${clan.color}88`,
                    flexShrink: 0,
                  }}
                />
                {/* Clan name */}
                <span
                  style={{
                    color: "#E8D8A0",
                    fontSize: 11,
                    fontWeight: 600,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {clan.name}
                </span>
                {/* Tile count */}
                <span
                  style={{
                    color: clan.color,
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {tiles.toLocaleString()}
                </span>
              </div>
            ))
          )}
          <div
            style={{
              fontSize: 9,
              color: "rgba(200,180,120,0.35)",
              textAlign: "center",
              marginTop: 4,
              letterSpacing: "0.05em",
            }}
          >
            TILES CONTROLLED
          </div>
        </div>
      )}
    </div>
  );
}
