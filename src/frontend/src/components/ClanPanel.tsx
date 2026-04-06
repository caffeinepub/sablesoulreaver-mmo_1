import React, { useState } from "react";
import type { LocalClan } from "../types/game";
import { CLAN_COLORS } from "../types/game";

interface Props {
  username: string;
  clans: LocalClan[];
  serverId: number;
  onCreateClan: (name: string, color: string) => void;
  onJoinClan: (id: string) => void;
  onKickMember?: (clanId: string, member: string) => void;
  onLeaveClan?: () => void;
  onSetMOTD?: (clanId: string, motd: string) => void;
  onPromoteMember?: (clanId: string, member: string) => void;
  onDeclareWar?: (targetClanId: string) => void;
  onEndWar?: (targetClanId: string) => void;
  myGold?: number;
  onActivateClanShield?: () => void;
}

export function ClanPanel({
  username,
  clans,
  serverId,
  onCreateClan,
  onJoinClan,
  onKickMember,
  onLeaveClan,
  onSetMOTD,
  onPromoteMember,
  onDeclareWar,
  onEndWar,
  myGold = 0,
  onActivateClanShield,
}: Props) {
  const [tab, setTab] = useState<
    "info" | "create" | "join" | "manage" | "wars"
  >("info");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(CLAN_COLORS[0]);
  const [joinId, setJoinId] = useState("");
  const [motd, setMotd] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const myClan = clans.find((c) => c.memberUsernames.includes(username));
  const isLeader = myClan?.leaderUsername === username;

  const availableClans = clans.filter(
    (c) => c.serverId === serverId && !c.memberUsernames.includes(username),
  );

  const filteredClans = searchQuery.trim()
    ? availableClans.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : availableClans;

  const activeWars = myClan?.declaredWars || [];
  // Also clans that declared war on us
  const warsOnUs = clans.filter(
    (c) => myClan && (c.declaredWars || []).includes(myClan.id),
  );

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "rgba(40,25,10,0.92)",
        border: "1px solid rgba(180,140,60,0.3)",
        color: "white",
      }}
    >
      <div className="text-xs font-bold mb-2" style={{ color: "#D4A96A" }}>
        CLAN
      </div>

      {myClan ? (
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ background: myClan.color }}
            />
            <span className="text-xs font-bold">{myClan.name}</span>
            {isLeader && (
              <span className="text-xs" style={{ color: "#ffd700" }}>
                \uD83D\uDC51
              </span>
            )}
          </div>
          {myClan.motd && (
            <div className="text-xs mt-1 italic" style={{ color: "#888" }}>
              "{myClan.motd}"
            </div>
          )}
          {activeWars.length > 0 && (
            <div className="text-xs mt-1" style={{ color: "#ff6666" }}>
              \u2694\uFE0F At war with {activeWars.length} clan(s)
            </div>
          )}
          {isLeader &&
            onActivateClanShield &&
            (() => {
              const now = Date.now();
              const shieldOn =
                myClan.clanShieldActive &&
                myClan.clanShieldActivatedAt &&
                now - (myClan.clanShieldActivatedAt ?? 0) < 24 * 60 * 60 * 1000;
              const onCooldown =
                !shieldOn &&
                myClan.clanShieldCooldownUntil &&
                myClan.clanShieldCooldownUntil > now;
              const fmtTime = (ms: number) => {
                const h = Math.floor(ms / 3600000);
                const m = Math.floor((ms % 3600000) / 60000);
                return `${h}h ${m}m`;
              };
              if (shieldOn) {
                const remainMs =
                  24 * 60 * 60 * 1000 -
                  (now - (myClan.clanShieldActivatedAt ?? 0));
                return (
                  <div
                    className="mt-2 px-2 py-1 rounded text-xs font-bold text-center"
                    style={{
                      background: "rgba(0,180,100,0.15)",
                      border: "1px solid rgba(0,200,120,0.4)",
                      color: "#44ffaa",
                    }}
                  >
                    🛡 Clan Shield: {fmtTime(remainMs)} remaining
                  </div>
                );
              }
              if (onCooldown) {
                const cdMs = (myClan.clanShieldCooldownUntil ?? 0) - now;
                return (
                  <div
                    className="mt-2 px-2 py-1 rounded text-xs font-bold text-center"
                    style={{
                      background: "rgba(180,100,0,0.15)",
                      border: "1px solid rgba(200,140,0,0.4)",
                      color: "#ffaa44",
                    }}
                  >
                    🛡 Clan Shield: Cooldown {fmtTime(cdMs)}
                  </div>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => {
                    onActivateClanShield?.();
                  }}
                  className="mt-2 w-full py-1.5 rounded text-xs font-bold"
                  style={{
                    background: "linear-gradient(90deg,#003a20,#005a30)",
                    border: "1px solid rgba(0,220,120,0.5)",
                    color: "#44ffcc",
                    cursor: "pointer",
                  }}
                  data-ocid="clan.toggle"
                >
                  🛡 Activate Clan Shield (24h)
                </button>
              );
            })()}
        </div>
      ) : (
        <div className="text-xs" style={{ color: "#aaa" }}>
          No Clan
        </div>
      )}

      <div className="flex gap-1 mt-2 flex-wrap">
        {!myClan && (
          <>
            <button
              type="button"
              onClick={() => setTab(tab === "create" ? "info" : "create")}
              className="flex-1 py-1 rounded text-xs"
              style={{ background: "#1a3a10", color: "#7DCF45" }}
              data-ocid="clan.button"
            >
              + Create
            </button>
            <button
              type="button"
              onClick={() => {
                setTab(tab === "join" ? "info" : "join");
                setSearchQuery("");
              }}
              className="flex-1 py-1 rounded text-xs"
              style={{ background: "#1a2a3a", color: "#45a8cf" }}
              data-ocid="clan.button"
            >
              Join
            </button>
          </>
        )}
        {myClan && (
          <>
            {(isLeader || onSetMOTD) && (
              <button
                type="button"
                onClick={() => setTab(tab === "manage" ? "info" : "manage")}
                className="flex-1 py-1 rounded text-xs"
                style={{ background: "#2a1a3a", color: "#cc88ff" }}
                data-ocid="clan.button"
              >
                Manage
              </button>
            )}
            {isLeader && onDeclareWar && (
              <button
                type="button"
                onClick={() => setTab(tab === "wars" ? "info" : "wars")}
                className="flex-1 py-1 rounded text-xs"
                style={{ background: "#3a1010", color: "#ff6666" }}
                data-ocid="clan.button"
              >
                \u2694 Wars
              </button>
            )}
            {onLeaveClan && (
              <button
                type="button"
                onClick={() => {
                  onLeaveClan();
                  setTab("info");
                }}
                className="flex-1 py-1 rounded text-xs"
                style={{ background: "#3a1010", color: "#ff8888" }}
                data-ocid="clan.delete_button"
              >
                Leave
              </button>
            )}
          </>
        )}
      </div>

      {tab === "create" && !myClan && (
        <div className="mt-2">
          <input
            className="w-full text-xs px-2 py-1 rounded mb-1"
            placeholder="Clan name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            data-ocid="clan.input"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(180,140,60,0.3)",
              color: "white",
              outline: "none",
            }}
          />
          <div className="flex flex-wrap gap-1 mb-1">
            {CLAN_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full"
                style={{
                  background: c,
                  outline: newColor === c ? "2px solid white" : "none",
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
          <div
            className="text-xs mb-1 text-center"
            style={{ color: "#ffcc44" }}
          >
            Cost: 10,000 💰 gold
          </div>
          <button
            type="button"
            onClick={() => {
              if (newName.trim()) {
                onCreateClan(newName.trim(), newColor);
                setTab("info");
                setNewName("");
              }
            }}
            className="w-full py-1 rounded text-xs font-bold"
            style={{
              background: myGold >= 10000 ? "#3a7a10" : "#555",
              color: "white",
            }}
            data-ocid="clan.submit_button"
          >
            Create Clan (10,000 gold)
          </button>
          {myGold < 10000 && (
            <div
              className="text-xs mt-1 text-center"
              style={{ color: "#ff8888" }}
            >
              ❌ Need {(10000 - myGold).toLocaleString()} more gold
            </div>
          )}
        </div>
      )}

      {tab === "join" && !myClan && (
        <div className="mt-2">
          <div className="relative mb-2">
            <span
              className="absolute left-2 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: "#aaa" }}
            >
              \uD83D\uDD0D
            </span>
            <input
              className="w-full text-xs pl-6 pr-2 py-1 rounded"
              placeholder="Search clans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              data-ocid="clan.input"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(180,140,60,0.3)",
                color: "white",
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                style={{
                  color: "#aaa",
                  background: "transparent",
                  border: "none",
                }}
              >
                \u2715
              </button>
            )}
          </div>

          {filteredClans.length > 0 ? (
            <div
              style={{
                maxHeight: 160,
                overflowY: "auto",
                scrollbarWidth: "thin",
              }}
            >
              {filteredClans.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between mb-1"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: c.color }}
                    />
                    <div>
                      <div className="text-xs font-semibold">{c.name}</div>
                      <div className="text-xs" style={{ color: "#888" }}>
                        {c.memberUsernames.length}{" "}
                        {c.memberUsernames.length === 1 ? "member" : "members"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onJoinClan(c.id);
                      setTab("info");
                    }}
                    className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                    style={{ background: "#1a3a10", color: "#7DCF45" }}
                    data-ocid="clan.button"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="text-xs text-center py-2" style={{ color: "#888" }}>
              No clans found for "{searchQuery}"
            </div>
          ) : (
            <>
              <div className="text-xs mb-1" style={{ color: "#aaa" }}>
                Or enter clan ID:
              </div>
              <input
                className="w-full text-xs px-2 py-1 rounded mb-1"
                placeholder="Clan ID"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                data-ocid="clan.input"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(180,140,60,0.3)",
                  color: "white",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (joinId.trim()) {
                    onJoinClan(joinId.trim());
                    setTab("info");
                    setJoinId("");
                  }
                }}
                className="w-full py-1 rounded text-xs font-bold"
                style={{ background: "#1a3a10", color: "#7DCF45" }}
                data-ocid="clan.submit_button"
              >
                Join Clan
              </button>
            </>
          )}
        </div>
      )}

      {tab === "manage" && myClan && (
        <div className="mt-2">
          {onSetMOTD && (
            <div className="mb-2">
              <input
                className="w-full text-xs px-2 py-1 rounded mb-1"
                placeholder="Set clan MOTD..."
                value={motd}
                onChange={(e) => setMotd(e.target.value)}
                data-ocid="clan.input"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(100,100,200,0.3)",
                  color: "white",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  onSetMOTD(myClan.id, motd);
                  setMotd("");
                }}
                className="w-full py-1 rounded text-xs font-bold"
                style={{ background: "#2a1a4a", color: "#cc88ff" }}
                data-ocid="clan.submit_button"
              >
                Set MOTD
              </button>
            </div>
          )}
          <div className="text-xs font-semibold mb-1" style={{ color: "#aaa" }}>
            Members ({myClan.memberUsernames.length})
          </div>
          {myClan.memberUsernames.map((member) => (
            <div
              key={member}
              className="flex items-center justify-between py-1"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="text-xs">
                {member === myClan.leaderUsername ? "\uD83D\uDC51 " : ""}
                {member}
                {member === username ? " (you)" : ""}
              </span>
              {isLeader && member !== username && (
                <div className="flex gap-1">
                  {onPromoteMember && (
                    <button
                      type="button"
                      onClick={() => onPromoteMember(myClan.id, member)}
                      className="text-xs px-1 py-0.5 rounded"
                      style={{
                        background: "rgba(255,215,0,0.15)",
                        color: "#ffd700",
                      }}
                      data-ocid="clan.button"
                    >
                      \u2B06\uFE0F
                    </button>
                  )}
                  {onKickMember && (
                    <button
                      type="button"
                      onClick={() => onKickMember(myClan.id, member)}
                      className="text-xs px-1 py-0.5 rounded"
                      style={{
                        background: "rgba(200,50,50,0.15)",
                        color: "#ff8888",
                      }}
                      data-ocid="clan.delete_button"
                    >
                      \u274C
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "wars" && myClan && isLeader && (
        <div className="mt-2">
          <div className="text-xs font-bold mb-2" style={{ color: "#ff6666" }}>
            \u2694\uFE0F War Status
          </div>

          {/* Wars declared by us */}
          {activeWars.length > 0 && (
            <div className="mb-2">
              <div className="text-xs mb-1" style={{ color: "#aaa" }}>
                Wars we declared:
              </div>
              {activeWars.map((wId) => {
                const wc = clans.find((c) => c.id === wId);
                if (!wc) return null;
                return (
                  <div
                    key={wId}
                    className="flex items-center justify-between py-1"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: wc.color }}
                      />
                      <span className="text-xs" style={{ color: wc.color }}>
                        {wc.name}
                      </span>
                    </div>
                    {onEndWar && (
                      <button
                        type="button"
                        onClick={() => onEndWar(wId)}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          background: "rgba(100,200,50,0.15)",
                          color: "#88dd44",
                        }}
                        data-ocid="clan.button"
                      >
                        End War
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Wars declared against us */}
          {warsOnUs.length > 0 && (
            <div className="mb-2">
              <div className="text-xs mb-1" style={{ color: "#ff8888" }}>
                Wars declared against us:
              </div>
              {warsOnUs.map((wc) => (
                <div
                  key={wc.id}
                  className="flex items-center gap-2 py-1"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: wc.color }}
                  />
                  <span className="text-xs" style={{ color: "#ff8888" }}>
                    {wc.name} declared war on us!
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Declare war on other clans */}
          <div className="text-xs font-semibold mb-1" style={{ color: "#aaa" }}>
            Declare War:
          </div>
          {availableClans.length === 0 ? (
            <div className="text-xs" style={{ color: "#666" }}>
              No other clans
            </div>
          ) : (
            availableClans.map((oc) => {
              const alreadyAtWar =
                activeWars.includes(oc.id) ||
                (oc.declaredWars || []).includes(myClan.id);
              return (
                <div
                  key={oc.id}
                  className="flex items-center justify-between py-1"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: oc.color }}
                    />
                    <span className="text-xs">{oc.name}</span>
                    {alreadyAtWar && (
                      <span
                        className="text-xs px-1 rounded"
                        style={{
                          background: "rgba(255,50,50,0.2)",
                          color: "#ff6666",
                        }}
                      >
                        AT WAR
                      </span>
                    )}
                  </div>
                  {!alreadyAtWar && onDeclareWar && (
                    <button
                      type="button"
                      onClick={() => onDeclareWar(oc.id)}
                      className="text-xs px-2 py-0.5 rounded font-bold"
                      style={{
                        background: "rgba(200,30,30,0.3)",
                        color: "#ff6666",
                        border: "1px solid rgba(200,50,50,0.4)",
                      }}
                      data-ocid="clan.button"
                    >
                      \u2694 War
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
