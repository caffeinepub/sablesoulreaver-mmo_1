import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { MarchingArmy, TeleportCharge } from "../types/game";

const MAP_SIZE = 100000;

interface Props {
  teleports: TeleportCharge[];
  onUseTeleport: (chargeId: number, x: number, y: number) => boolean;
  onNavigate: (x: number, y: number) => void;
  onClose: () => void;
  marchingArmies?: MarchingArmy[];
  username?: string;
}

export function TeleportPanel({
  teleports,
  onUseTeleport,
  onNavigate,
  onClose,
  marchingArmies = [],
  username = "",
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedCharge, setSelectedCharge] = useState<number | null>(null);
  const [targetX, setTargetX] = useState(50000);
  const [targetY, setTargetY] = useState(50000);
  const [inputX, setInputX] = useState("50000");
  const [inputY, setInputY] = useState("50000");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const clamp = (v: number) => Math.max(0, Math.min(MAP_SIZE, Math.round(v)));

  const handleXInput = (val: string) => {
    setInputX(val);
    const n = Number(val);
    if (!Number.isNaN(n)) setTargetX(clamp(n));
  };

  const handleYInput = (val: string) => {
    setInputY(val);
    const n = Number(val);
    if (!Number.isNaN(n)) setTargetY(clamp(n));
  };

  const handleMapClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const nx = clamp(px * MAP_SIZE);
    const ny = clamp(py * MAP_SIZE);
    setTargetX(nx);
    setTargetY(ny);
    setInputX(String(nx));
    setInputY(String(ny));
  };

  const handleTeleport = () => {
    if (selectedCharge === null) return;
    // Feature 3: Cannot teleport while troops are marching
    const myActiveMarches = marchingArmies.filter(
      (m) => m.attackerUsername === username && m.targetType !== "return",
    );
    if (myActiveMarches.length > 0) {
      toast.error("Cannot teleport while troops are marching!");
      return;
    }
    const success = onUseTeleport(selectedCharge, targetX, targetY);
    if (success) {
      const camX = Math.max(0, targetX - window.innerWidth / 2);
      const camY = Math.max(0, targetY - window.innerHeight / 2);
      onNavigate(camX, camY);
      setSelectedCharge(null);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="rounded-xl p-5 w-80"
        style={{
          background: "#0a1a05",
          border: "2px solid rgba(80,120,255,0.4)",
          color: "white",
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: "#6688ff" }}>
            ⚡ Teleport
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            data-ocid="teleport.close_button"
          >
            ×
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: "#888" }}>
          Select a charge then set your destination anywhere on the map
          (0–100,000).
        </p>

        {/* Charge slots */}
        <div className="flex gap-2 mb-5">
          {teleports.map((charge) => {
            const onCooldown = charge.cooldownUntil > now;
            const secsLeft = Math.max(
              0,
              Math.ceil((charge.cooldownUntil - now) / 1000),
            );
            const mins = Math.floor(secsLeft / 60);
            const secs = secsLeft % 60;
            const isSelected = selectedCharge === charge.id;

            return (
              <button
                type="button"
                key={charge.id}
                onClick={() => !onCooldown && setSelectedCharge(charge.id)}
                disabled={onCooldown}
                className="flex-1 py-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1"
                style={{
                  background: isSelected
                    ? "rgba(80,120,255,0.35)"
                    : onCooldown
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(80,120,255,0.15)",
                  border: isSelected
                    ? "2px solid #6688ff"
                    : onCooldown
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px solid rgba(80,120,255,0.4)",
                  color: isSelected ? "#6688ff" : onCooldown ? "#444" : "#aac",
                  cursor: onCooldown ? "not-allowed" : "pointer",
                }}
                data-ocid="teleport.button"
              >
                <span>{onCooldown ? "⏳" : "⚡"}</span>
                <span>#{charge.id + 1}</span>
                {onCooldown && (
                  <span style={{ fontSize: 10 }}>
                    {mins}m{secs}s
                  </span>
                )}
                {!onCooldown && (
                  <span style={{ color: "#50cc50", fontSize: 10 }}>READY</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Coordinate picker */}
        {selectedCharge !== null && (
          <div
            className="rounded-lg p-3 mb-4"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <div
              className="text-xs font-semibold mb-3"
              style={{ color: "#aaa" }}
            >
              🗺️ Destination (0 – 100,000)
            </div>

            {/* X coordinate */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "#888" }}>
                  X
                </span>
                <input
                  type="number"
                  min={0}
                  max={MAP_SIZE}
                  value={inputX}
                  onChange={(e) => handleXInput(e.target.value)}
                  className="rounded px-2 py-0.5 text-xs w-28 text-right"
                  style={{
                    background: "rgba(80,120,255,0.12)",
                    border: "1px solid rgba(80,120,255,0.4)",
                    color: "#6688ff",
                    outline: "none",
                  }}
                  data-ocid="teleport.input"
                />
              </div>
              <input
                type="range"
                min={0}
                max={MAP_SIZE}
                step={100}
                value={targetX}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTargetX(v);
                  setInputX(String(v));
                }}
                className="w-full"
                style={{ accentColor: "#6688ff" }}
              />
            </div>

            {/* Y coordinate */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "#888" }}>
                  Y
                </span>
                <input
                  type="number"
                  min={0}
                  max={MAP_SIZE}
                  value={inputY}
                  onChange={(e) => handleYInput(e.target.value)}
                  className="rounded px-2 py-0.5 text-xs w-28 text-right"
                  style={{
                    background: "rgba(80,120,255,0.12)",
                    border: "1px solid rgba(80,120,255,0.4)",
                    color: "#6688ff",
                    outline: "none",
                  }}
                  data-ocid="teleport.input"
                />
              </div>
              <input
                type="range"
                min={0}
                max={MAP_SIZE}
                step={100}
                value={targetY}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTargetY(v);
                  setInputY(String(v));
                }}
                className="w-full"
                style={{ accentColor: "#6688ff" }}
              />
            </div>

            {/* Mini world preview - click to set position */}
            <button
              type="button"
              onClick={handleMapClick}
              className="relative mx-auto mb-3 rounded block"
              style={{
                width: 180,
                height: 180,
                background: "#0d1f05",
                border: "1px solid rgba(80,120,255,0.3)",
                cursor: "crosshair",
                padding: 0,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: (targetX / MAP_SIZE) * 180 - 5,
                  top: (targetY / MAP_SIZE) * 180 - 5,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#6688ff",
                  boxShadow: "0 0 8px #6688ff",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 4,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.15)",
                  fontSize: 9,
                  pointerEvents: "none",
                }}
              >
                Tap to place marker
              </div>
            </button>

            <button
              type="button"
              onClick={handleTeleport}
              className="w-full py-2 rounded-lg font-bold text-sm"
              style={{ background: "#1a2a6a", color: "#6688ff" }}
              data-ocid="teleport.primary_button"
            >
              ⚡ Teleport to ({targetX.toLocaleString()},{" "}
              {targetY.toLocaleString()})
            </button>
          </div>
        )}

        {selectedCharge === null && (
          <div className="text-xs text-center py-2" style={{ color: "#555" }}>
            Select a ready charge above to teleport
          </div>
        )}
      </div>
    </div>
  );
}
