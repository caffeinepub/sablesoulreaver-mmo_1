import React from "react";

interface ShopItem {
  id: string;
  icon: string;
  name: string;
  description: string;
  cost: number;
  category:
    | "military"
    | "defense"
    | "resources"
    | "utility"
    | "dragon"
    | "special_forces"
    | "hacker"
    | "recon";
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "speed_boost",
    icon: "⚡",
    name: "Speed Boost",
    description: "March speed x2 for 30 minutes",
    cost: 200,
    category: "military",
  },
  {
    id: "troop_pack_large",
    icon: "🗡️",
    name: "Large Troop Pack",
    description: "Instantly add 500 soldiers to your army",
    cost: 300,
    category: "military",
  },
  {
    id: "tank_pack",
    icon: "🛡️",
    name: "Tank Pack",
    description: "Instantly add 100 tanks to your army",
    cost: 500,
    category: "military",
  },
  {
    id: "jet_pack",
    icon: "✈️",
    name: "Jet Pack",
    description: "Instantly add 50 jets to your fleet",
    cost: 800,
    category: "military",
  },
  {
    id: "emergency_shield",
    icon: "🛡️",
    name: "Emergency Shield",
    description: "Activate a 2-hour invincibility shield",
    cost: 400,
    category: "defense",
  },
  {
    id: "base_repair",
    icon: "🏥",
    name: "Base Repair",
    description: "Instantly restore your base to full HP",
    cost: 250,
    category: "defense",
  },
  {
    id: "wall_reinforcement",
    icon: "🧱",
    name: "Wall Reinforcement",
    description: "Add +5,000 HP to your base walls",
    cost: 350,
    category: "defense",
  },
  {
    id: "resource_crate",
    icon: "📦",
    name: "Resource Crate",
    description: "Gain 5,000 wood, stone, and food",
    cost: 150,
    category: "resources",
  },
  {
    id: "xp_boost",
    icon: "⭐",
    name: "XP Boost",
    description: "2x level gains for 1 hour",
    cost: 200,
    category: "utility",
  },
  {
    id: "clan_tribute",
    icon: "💎",
    name: "Clan Tribute",
    description: "Donate 100 gold to your clan treasury",
    cost: 100,
    category: "utility",
  },
  {
    id: "training_boost",
    icon: "🪖",
    name: "Training Speed Boost",
    description: "Train troops 3x faster for 1 hour",
    cost: 180,
    category: "military",
  },
  {
    id: "gold_detector",
    icon: "🔍",
    name: "Gold Detector",
    description: "Reveals all gold field locations on the minimap",
    cost: 50,
    category: "utility",
  },
  {
    id: "nuke_shield",
    icon: "☢️",
    name: "Anti-Nuke Shield",
    description: "Block the next nuclear strike on your base",
    cost: 600,
    category: "defense",
  },
  {
    id: "spy_drone",
    icon: "🕵️",
    name: "Spy Drone",
    description: "Reveal enemy troop counts for 30 minutes",
    cost: 120,
    category: "utility",
  },
  {
    id: "buy_dragon",
    icon: "🐉",
    name: "Clan Dragon",
    description:
      "A mighty dragon guards your clan HQ. 560,000 HP & 400,000 armor. One per clan owner. Clan owners only.",
    cost: 55000000,
    category: "dragon",
  },
  {
    id: "start_clan",
    icon: "🏰",
    name: "Start a Clan",
    description:
      "Pay 10,000 gold to create your own clan. Become a clan leader instantly.",
    cost: 10000,
    category: "utility",
  },
  {
    id: "special_forces",
    icon: "🪖",
    name: "Special Forces Squad",
    description:
      "Elite team of 5 soldiers. Each unit: 50,000 HP & 40,000 armor HP. Attacks and defends as one unit. One squad per clan owner.",
    cost: 100000000,
    category: "special_forces",
  },
  {
    id: "buy_hacker",
    icon: "💻",
    name: "Hacker",
    description:
      "Hacks enemy shields for 1 minute. Defends your shield from cyber attacks. One per clan leader.",
    cost: 100500,
    category: "hacker",
  },
  {
    id: "spy_plane",
    icon: "🛩",
    name: "Spy Plane Pack",
    description:
      "Reveals enemy troops and garrisons within 5,000 units for 10 minutes. Grants 2 spy planes per purchase.",
    cost: 20000,
    category: "recon",
  },
  {
    id: "anti_air_gun",
    icon: "🔫",
    name: "Anti-Air Gun",
    description:
      "Intercepts enemy spy planes scouting your base. Higher chance with more guns. Max 3 per player.",
    cost: 15000,
    category: "defense",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  military: "rgba(200,50,50,0.15)",
  defense: "rgba(50,100,200,0.15)",
  resources: "rgba(50,180,50,0.15)",
  utility: "rgba(180,120,0,0.15)",
  dragon: "rgba(120,0,200,0.18)",
  special_forces: "rgba(0,180,120,0.18)",
  hacker: "rgba(0,120,180,0.18)",
  recon: "rgba(0,180,220,0.18)",
};

const CATEGORY_BORDER: Record<string, string> = {
  military: "rgba(200,80,80,0.4)",
  defense: "rgba(80,130,220,0.4)",
  resources: "rgba(80,200,80,0.4)",
  utility: "rgba(200,160,30,0.4)",
  dragon: "rgba(180,80,255,0.6)",
  special_forces: "rgba(50,220,150,0.6)",
  hacker: "rgba(0,200,255,0.6)",
  recon: "rgba(0,230,255,0.7)",
};

const CATEGORY_LABEL: Record<string, string> = {
  military: "#ff8888",
  defense: "#88aaff",
  resources: "#88dd88",
  utility: "#ffcc44",
  dragon: "#cc88ff",
  special_forces: "#44ffaa",
  hacker: "#00ccff",
  recon: "#00eeff",
};

interface Props {
  gold: number;
  onBuy: (itemId: string, cost: number) => boolean;
  onClose: () => void;
  isClanOwner?: boolean;
  hasClanDragon?: boolean;
  hasSpecialForces?: boolean;
  hasHacker?: boolean;
  antiAirCount?: number;
  serverId?: number;
}

export function ShopPanel({
  gold,
  onBuy,
  onClose,
  isClanOwner,
  hasClanDragon,
  hasSpecialForces,
  hasHacker,
  antiAirCount = 0,
  serverId = 1,
}: Props) {
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [purchasedMsg, setPurchasedMsg] = React.useState("");
  const sfKey = `ssmmo_specialforces_${serverId}`;

  const categories = [
    "all",
    "military",
    "defense",
    "resources",
    "utility",
    "recon",
    "dragon",
    "special_forces",
    "hacker",
  ];
  const filtered =
    activeCategory === "all"
      ? SHOP_ITEMS
      : SHOP_ITEMS.filter((i) => i.category === activeCategory);

  const handleBuy = (item: ShopItem) => {
    if (item.id === "buy_dragon") {
      if (!isClanOwner) {
        setPurchasedMsg("❌ Only clan owners can buy a Dragon!");
        setTimeout(() => setPurchasedMsg(""), 3000);
        return;
      }
      if (hasClanDragon) {
        setPurchasedMsg("❌ Your clan already has a Dragon!");
        setTimeout(() => setPurchasedMsg(""), 3000);
        return;
      }
    }
    if (item.id === "special_forces") {
      if (!isClanOwner) {
        setPurchasedMsg("⚠ Clan owners only, one squad per clan");
        setTimeout(() => setPurchasedMsg(""), 3000);
        return;
      }
      const alreadyHas =
        hasSpecialForces || localStorage.getItem(sfKey) === "1";
      if (alreadyHas) {
        setPurchasedMsg("❌ Your clan already has a Special Forces Squad!");
        setTimeout(() => setPurchasedMsg(""), 3000);
        return;
      }
    }
    if (item.id === "buy_hacker") {
      if (!isClanOwner) {
        setPurchasedMsg("⚠ Clan leaders only, one Hacker per clan");
        setTimeout(() => setPurchasedMsg(""), 3000);
        return;
      }
      if (hasHacker) {
        setPurchasedMsg("❌ You already own a Hacker!");
        setTimeout(() => setPurchasedMsg(""), 3000);
        return;
      }
    }
    if (item.id === "anti_air_gun") {
      if (antiAirCount >= 3) {
        setPurchasedMsg("❌ Max 3 Anti-Air Guns per player!");
        setTimeout(() => setPurchasedMsg(""), 3000);
        return;
      }
    }
    if (gold < item.cost) {
      setPurchasedMsg(
        `❌ Not enough gold! Need ${item.cost.toLocaleString()} 💰`,
      );
      setTimeout(() => setPurchasedMsg(""), 2000);
      return;
    }
    const ok = onBuy(item.id, item.cost);
    if (ok) {
      if (item.id === "special_forces") {
        localStorage.setItem(sfKey, "1");
      }
      setPurchasedMsg(`✅ ${item.name} purchased!`);
      setTimeout(() => setPurchasedMsg(""), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)" }}
      data-ocid="shop.dialog"
    >
      <div
        className="rounded-xl w-80 max-h-screen flex flex-col"
        style={{
          background: "#0a0800",
          border: "2px solid rgba(255,200,0,0.5)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-4 py-3 flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(255,200,0,0.2)",
            background: "rgba(255,180,0,0.06)",
          }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: "#ffd700" }}>
              💰 Gold Shop
            </h2>
            <div className="text-xs mt-0.5" style={{ color: "#ffcc44" }}>
              Balance: {gold.toLocaleString()} 💰 gold
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            data-ocid="shop.close_button"
          >
            ×
          </button>
        </div>

        {/* Category tabs */}
        <div
          className="flex gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto"
          style={{ borderBottom: "1px solid rgba(255,200,0,0.15)" }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="px-2 py-1 rounded text-xs font-bold flex-shrink-0"
              style={{
                background:
                  activeCategory === cat
                    ? cat === "dragon"
                      ? "rgba(150,50,255,0.3)"
                      : cat === "special_forces"
                        ? "rgba(0,180,120,0.3)"
                        : cat === "hacker"
                          ? "rgba(0,120,180,0.3)"
                          : "rgba(255,200,0,0.25)"
                    : "rgba(255,255,255,0.05)",
                border:
                  activeCategory === cat
                    ? cat === "dragon"
                      ? "1px solid rgba(180,80,255,0.7)"
                      : cat === "special_forces"
                        ? "1px solid rgba(50,220,150,0.7)"
                        : cat === "hacker"
                          ? "1px solid rgba(0,200,255,0.7)"
                          : cat === "recon"
                            ? "1px solid rgba(0,230,255,0.7)"
                            : "1px solid rgba(255,200,0,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                color:
                  activeCategory === cat
                    ? cat === "dragon"
                      ? "#cc88ff"
                      : cat === "special_forces"
                        ? "#44ffaa"
                        : cat === "hacker"
                          ? "#00ccff"
                          : cat === "recon"
                            ? "#00eeff"
                            : "#ffd700"
                    : "#aaa",
              }}
              data-ocid="shop.tab"
            >
              {cat === "dragon"
                ? "🐉 Dragon"
                : cat === "special_forces"
                  ? "⚔ Special Forces"
                  : cat === "hacker"
                    ? "💻 Hacker"
                    : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Feedback message */}
        {purchasedMsg && (
          <div
            className="mx-3 mt-2 px-3 py-2 rounded text-xs font-bold text-center flex-shrink-0"
            style={{
              background: purchasedMsg.startsWith("✅")
                ? "rgba(50,200,50,0.15)"
                : "rgba(200,50,50,0.15)",
              border: purchasedMsg.startsWith("✅")
                ? "1px solid rgba(100,200,100,0.4)"
                : "1px solid rgba(200,100,100,0.4)",
              color: purchasedMsg.startsWith("✅") ? "#88dd88" : "#ff8888",
            }}
            data-ocid="shop.success_state"
          >
            {purchasedMsg}
          </div>
        )}

        {/* Items list */}
        <div className="overflow-y-auto flex-1 px-3 py-2 flex flex-col gap-2">
          {filtered.map((item) => {
            const isDragonItem = item.id === "buy_dragon";
            const isHackerItem = item.id === "buy_hacker";
            const isAntiAirItem = item.id === "anti_air_gun";
            const dragonLocked =
              isDragonItem && (!isClanOwner || hasClanDragon);
            const hackerLocked = isHackerItem && (!isClanOwner || hasHacker);
            const antiAirLocked = isAntiAirItem && antiAirCount >= 3;
            const canAfford = gold >= item.cost;
            const buyable =
              canAfford && !dragonLocked && !hackerLocked && !antiAirLocked;
            return (
              <div
                key={item.id}
                className="rounded-lg p-3 flex items-center gap-3"
                style={{
                  background: CATEGORY_COLORS[item.category],
                  border: `1px solid ${CATEGORY_BORDER[item.category]}`,
                  boxShadow: isDragonItem
                    ? "0 0 12px rgba(160,50,255,0.3)"
                    : isHackerItem
                      ? "0 0 12px rgba(0,180,255,0.3)"
                      : undefined,
                }}
                data-ocid={`shop.item.${SHOP_ITEMS.indexOf(item) + 1}`}
              >
                <div className="text-2xl flex-shrink-0">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-bold"
                    style={{ color: CATEGORY_LABEL[item.category] }}
                  >
                    {item.name}
                    {isDragonItem && hasClanDragon && (
                      <span style={{ color: "#888", marginLeft: 4 }}>
                        (Owned)
                      </span>
                    )}
                    {isDragonItem && !isClanOwner && (
                      <span style={{ color: "#888", marginLeft: 4 }}>
                        (Clan Owner Only)
                      </span>
                    )}
                    {isAntiAirItem && (
                      <span
                        style={{
                          color: antiAirCount >= 3 ? "#888" : "#88aaff",
                          marginLeft: 4,
                        }}
                      >
                        ({antiAirCount}/3)
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#aaa" }}>
                    {item.description}
                  </div>
                  <div
                    className="text-xs mt-0.5 font-bold"
                    style={{ color: "#ffd700" }}
                  >
                    💰 {item.cost.toLocaleString()} gold
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleBuy(item)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: buyable
                      ? isDragonItem
                        ? "rgba(150,50,255,0.3)"
                        : isHackerItem
                          ? "rgba(0,120,180,0.3)"
                          : "rgba(255,200,0,0.25)"
                      : "rgba(100,100,100,0.2)",
                    border: buyable
                      ? isDragonItem
                        ? "1px solid rgba(180,80,255,0.7)"
                        : isHackerItem
                          ? "1px solid rgba(0,200,255,0.7)"
                          : "1px solid rgba(255,200,0,0.5)"
                      : "1px solid rgba(100,100,100,0.3)",
                    color: buyable
                      ? isDragonItem
                        ? "#cc88ff"
                        : isHackerItem
                          ? "#00ccff"
                          : "#ffd700"
                      : "#666",
                  }}
                  data-ocid="shop.button"
                >
                  {dragonLocked || hackerLocked || antiAirLocked ? "🔒" : "Buy"}
                </button>
              </div>
            );
          })}
        </div>

        <div
          className="px-3 py-2 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,200,0,0.15)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded text-sm"
            style={{ background: "rgba(255,255,255,0.08)", color: "#888" }}
            data-ocid="shop.cancel_button"
          >
            Close Shop
          </button>
        </div>
      </div>
    </div>
  );
}
