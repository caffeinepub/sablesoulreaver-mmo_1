import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { TroopCounts } from "../types/game";

interface HealingEntry {
  id: string;
  type: "soldiers" | "tanks" | "jets";
  count: number;
  startedAt: number;
  completesAt: number;
}

interface Props {
  troops: TroopCounts;
  gold?: number;
  onDeductGold?: (amount: number) => void;
  onHealComplete: (type: "soldiers" | "tanks" | "jets", count: number) => void;
  onClose: () => void;
}

const HEAL_DURATION = 5 * 60 * 1000; // 5 minutes
const HEAL_GOLD_COST = 10;

export function HospitalPanel({
  troops,
  gold,
  onDeductGold,
  onHealComplete,
  onClose,
}: Props) {
  const [queue, setQueue] = useState<HealingEntry[]>([]);
  const [soldierInput, setSoldierInput] = useState("50");
  const [tankInput, setTankInput] = useState("10");
  const [jetInput, setJetInput] = useState("5");
  const [now, setNow] = useState(() => Date.now());
  const completedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // Fire completions
  useEffect(() => {
    for (const entry of queue) {
      if (now >= entry.completesAt && !completedRef.current.has(entry.id)) {
        completedRef.current.add(entry.id);
        onHealComplete(entry.type, entry.count);
      }
    }
    // Prune completed after 4 seconds display
    setQueue((prev) => prev.filter((e) => now < e.completesAt + 4000));
  }, [now, queue, onHealComplete]);

  const addHeal = (type: "soldiers" | "tanks" | "jets", raw: string) => {
    const count = Math.max(1, Math.min(99999, Number.parseInt(raw, 10) || 0));
    if (count <= 0) return;

    // Check gold cost
    const currentGold = gold ?? Number.POSITIVE_INFINITY;
    if (currentGold < HEAL_GOLD_COST) {
      toast.error(
        `❌ Not enough gold to heal (${HEAL_GOLD_COST} gold required)`,
        {
          duration: 3000,
        },
      );
      return;
    }

    // Deduct gold
    onDeductGold?.(HEAL_GOLD_COST);

    const entry: HealingEntry = {
      id: `heal_${Date.now()}_${Math.random()}`,
      type,
      count,
      startedAt: Date.now(),
      completesAt: Date.now() + HEAL_DURATION,
    };
    setQueue((prev) => [...prev, entry]);
    toast.success(`🏥 Healing ${count} ${type} — Cost: ${HEAL_GOLD_COST} 💰`, {
      duration: 2000,
    });
  };

  const typeLabel = (t: string) =>
    t === "soldiers" ? "🗡️ Soldiers" : t === "tanks" ? "🛡️ Tanks" : "✈️ Jets";
  const typeColor = (t: string) =>
    t === "soldiers" ? "#7DCF45" : t === "tanks" ? "#ff9800" : "#45a8cf";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="rounded-xl p-5 w-80 max-h-screen overflow-y-auto"
        style={{
          background: "#0a1a0f",
          border: "2px solid #2a6a3a",
          color: "white",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: "#50ee88" }}>
            🏥 Hospital
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            data-ocid="hospital.close_button"
          >
            ×
          </button>
        </div>

        {/* Gold balance */}
        {gold !== undefined && (
          <div
            className="mb-3 rounded-lg px-3 py-2 flex items-center justify-between"
            style={{
              background: "rgba(255,215,0,0.08)",
              border: "1px solid rgba(255,215,0,0.25)",
            }}
          >
            <span style={{ color: "#aaa", fontSize: 12 }}>Your Gold</span>
            <span
              style={{ color: "#ffd700", fontWeight: "bold", fontSize: 13 }}
            >
              💰 {gold.toLocaleString()}
            </span>
          </div>
        )}

        {/* Heal cost notice */}
        <div
          className="mb-3 rounded-lg px-3 py-2 text-center"
          style={{
            background: "rgba(255,150,0,0.08)",
            border: "1px solid rgba(255,150,0,0.25)",
            fontSize: 11,
            color: "#ffaa44",
          }}
        >
          Each heal batch costs{" "}
          <strong style={{ color: "#ffd700" }}>{HEAL_GOLD_COST} 💰 gold</strong>
        </div>

        <p className="text-xs mb-4" style={{ color: "#888" }}>
          Queue troops for healing. Each batch takes up to 5 minutes.
        </p>

        {/* Current troops */}
        <div
          className="mb-4 rounded-lg p-3"
          style={{
            background: "rgba(80,220,130,0.07)",
            border: "1px solid rgba(80,220,130,0.2)",
          }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: "#aaa" }}>
            Current Army
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

        {/* Heal inputs */}
        {[
          {
            type: "soldiers" as const,
            input: soldierInput,
            setInput: setSoldierInput,
          },
          { type: "tanks" as const, input: tankInput, setInput: setTankInput },
          { type: "jets" as const, input: jetInput, setInput: setJetInput },
        ].map(({ type, input, setInput }) => (
          <div key={type} className="mb-3">
            <div className="flex gap-2">
              <input
                className="flex-1 text-xs px-2 py-1.5 rounded"
                type="number"
                min={1}
                placeholder={`# ${type}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                data-ocid="hospital.input"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(80,220,130,0.25)",
                  color: "white",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => addHeal(type, input)}
                className="px-3 py-1.5 rounded text-xs font-bold flex-shrink-0"
                style={{
                  background: "rgba(50,180,90,0.25)",
                  border: "1px solid rgba(80,220,130,0.4)",
                  color: typeColor(type),
                }}
                data-ocid="hospital.button"
              >
                🏥 Heal {typeLabel(type)}
              </button>
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#888",
                marginTop: 2,
                textAlign: "right",
              }}
            >
              Cost: {HEAL_GOLD_COST} 💰
            </div>
          </div>
        ))}

        {/* Healing queue */}
        {queue.length > 0 && (
          <div className="mt-4">
            <div
              className="text-xs font-semibold mb-2"
              style={{ color: "#aaa" }}
            >
              Healing Queue ({queue.length})
            </div>
            <div className="flex flex-col gap-2">
              {queue.map((entry, idx) => {
                const elapsed = now - entry.startedAt;
                const isDone = now >= entry.completesAt;
                const pct = isDone
                  ? 100
                  : Math.min(100, (elapsed / HEAL_DURATION) * 100);
                const remaining = Math.max(0, entry.completesAt - now);
                const remMins = Math.floor(remaining / 60000);
                const remSecs = Math.floor((remaining % 60000) / 1000);

                return (
                  <div
                    key={entry.id}
                    className="rounded-lg p-2"
                    style={{
                      background: isDone
                        ? "rgba(50,180,90,0.2)"
                        : "rgba(255,255,255,0.05)",
                      border: isDone
                        ? "1px solid rgba(80,220,130,0.4)"
                        : "1px solid rgba(255,255,255,0.1)",
                    }}
                    data-ocid={`hospital.item.${idx + 1}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className="text-xs font-bold"
                        style={{ color: typeColor(entry.type) }}
                      >
                        {typeLabel(entry.type)} × {entry.count.toLocaleString()}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: isDone ? "#50ee88" : "#888" }}
                      >
                        {isDone ? "✅ Healed!" : `⏳ ${remMins}m ${remSecs}s`}
                      </span>
                    </div>
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{ height: 4, background: "rgba(255,255,255,0.1)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: isDone
                            ? "#50ee88"
                            : "linear-gradient(90deg, #2a9a55, #50ee88)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {queue.length === 0 && (
          <div
            className="text-center text-xs py-4 rounded-lg mt-2"
            style={{
              color: "#555",
              border: "1px dashed rgba(80,220,130,0.15)",
            }}
            data-ocid="hospital.empty_state"
          >
            No troops in healing queue
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-2 rounded text-sm"
          style={{ background: "rgba(255,255,255,0.08)", color: "#aaa" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
