import React from "react";
import type { AttackLogEntry } from "../types/game";

interface Props {
  attacks: AttackLogEntry[];
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export function AllAttacksPanel({ attacks, onClose }: Props) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to latest on each render
  React.useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  return (
    <div
      data-ocid="attack_log.panel"
      style={{
        position: "fixed",
        right: 8,
        top: 60,
        width: 310,
        maxHeight: "60vh",
        zIndex: 50,
        background: "rgba(5, 10, 3, 0.96)",
        border: "1.5px solid rgba(255, 80, 80, 0.45)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 24px rgba(255,60,60,0.25), 0 4px 20px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid rgba(255,80,80,0.25)",
          background: "rgba(180, 20, 20, 0.18)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "#ff6666",
            fontWeight: "bold",
            fontSize: 13,
            letterSpacing: "0.05em",
          }}
        >
          ⚔ Attack Log
        </span>
        <button
          data-ocid="attack_log.close_button"
          type="button"
          onClick={onClose}
          style={{
            background: "rgba(255,60,60,0.2)",
            border: "1px solid rgba(255,60,60,0.4)",
            borderRadius: 6,
            color: "#ff8888",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "bold",
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* Scroll area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "6px 8px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,60,60,0.3) transparent",
        }}
      >
        {attacks.length === 0 ? (
          <div
            data-ocid="attack_log.empty_state"
            style={{
              color: "rgba(200,200,200,0.4)",
              fontSize: 12,
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            No attacks recorded yet
          </div>
        ) : (
          [...attacks]
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((entry, idx) => (
              <div
                key={entry.id}
                data-ocid={`attack_log.item.${idx + 1}`}
                style={{
                  padding: "5px 6px",
                  marginBottom: 3,
                  borderRadius: 6,
                  background: "rgba(255,60,60,0.07)",
                  border: "1px solid rgba(255,60,60,0.12)",
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 2,
                  }}
                >
                  <span style={{ color: "#ffaaaa", fontWeight: "bold" }}>
                    ⚔ {entry.attackerName}
                  </span>
                  <span
                    style={{ color: "rgba(180,180,180,0.6)", fontSize: 10 }}
                  >
                    {timeAgo(entry.timestamp)}
                  </span>
                </div>
                <div style={{ color: "rgba(220,200,200,0.85)" }}>
                  → {entry.targetName}{" "}
                  <span
                    style={{
                      color: "rgba(150,220,150,0.8)",
                      fontFamily: "monospace",
                    }}
                  >
                    ({Math.round(entry.targetX)}, {Math.round(entry.targetY)})
                  </span>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Footer count */}
      <div
        style={{
          padding: "4px 12px",
          borderTop: "1px solid rgba(255,80,80,0.15)",
          color: "rgba(200,180,180,0.5)",
          fontSize: 10,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {attacks.length} event{attacks.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
