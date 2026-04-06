import type React from "react";
import { useEffect, useRef, useState } from "react";

interface Props {
  attackerName: string;
  defenderName: string;
  attackerHp?: number;
  attackerMaxHp?: number;
  defenderHp?: number;
  defenderMaxHp?: number;
  attackerTroops?: number;
  defenderTroops?: number;
  battleDuration?: number; // seconds, default 180
  onClose: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

interface Soldier {
  x: number;
  y: number;
  vx: number;
  side: "left" | "right";
  frame: number;
}

interface Tank {
  x: number;
  y: number;
  vx: number;
  side: "left" | "right";
}

interface Jet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
}

function getBarColor(ratio: number): string {
  if (ratio > 0.6) return "#22dd44";
  if (ratio > 0.3) return "#ffcc00";
  return "#ff3322";
}

function getBarGlow(ratio: number): string {
  if (ratio > 0.6) return "0 0 8px #22dd44, 0 0 16px #00aa22";
  if (ratio > 0.3) return "0 0 8px #ffcc00, 0 0 16px #aa8800";
  return "0 0 8px #ff3322, 0 0 16px #aa0000";
}

export function BattleWindow({
  attackerName,
  defenderName,
  attackerHp,
  attackerMaxHp,
  defenderHp,
  defenderMaxHp,
  attackerTroops,
  defenderTroops,
  battleDuration = 180,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef({
    particles: [] as Particle[],
    explosions: [] as Explosion[],
    soldiers: [] as Soldier[],
    tanks: [] as Tank[],
    jets: [] as Jet[],
    tick: 0,
  });

  // HP live refs (avoids re-renders)
  const atkHpRef = useRef(attackerHp ?? 8000);
  const defHpRef = useRef(defenderHp ?? 8000);
  const atkMaxHp = attackerMaxHp ?? attackerHp ?? 8000;
  const defMaxHp = defenderMaxHp ?? defenderHp ?? 8000;

  // Displayed HP state (updated every ~300ms)
  const [displayHp, setDisplayHp] = useState({
    atk: atkHpRef.current,
    def: defHpRef.current,
  });

  // Battle countdown (3 minutes)
  const [countdown, setCountdown] = useState(battleDuration);
  const [battleResult, setBattleResult] = useState<
    "attacker" | "defender" | null
  >(null);
  const battleStartRef = useRef(Date.now());

  // Pulsing live dot
  const [livePulse, setLivePulse] = useState(true);

  // Countdown timer effect
  useEffect(() => {
    if (battleResult) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - battleStartRef.current) / 1000);
      const remaining = Math.max(0, battleDuration - elapsed);
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        // Determine winner
        if (defHpRef.current <= 0) {
          setBattleResult("attacker");
        } else {
          setBattleResult("defender");
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [battleDuration, battleResult]);

  // HP drain simulation over the battle duration
  useEffect(() => {
    atkHpRef.current = attackerHp ?? 8000;
    defHpRef.current = defenderHp ?? 8000;

    const totalTicks = (battleDuration * 1000) / 200; // ticks over full duration
    // Drain attacker HP over full duration (loses ~30% of max)
    const atkDrainPerTick = (atkMaxHp * 0.3) / totalTicks;
    // Drain defender HP faster (loses ~80% of max)
    const defDrainPerTick = (defMaxHp * 0.8) / totalTicks;

    const drainInterval = setInterval(() => {
      const variance = 0.5 + Math.random();
      atkHpRef.current = Math.max(
        0,
        atkHpRef.current - atkDrainPerTick * variance,
      );
      defHpRef.current = Math.max(
        0,
        defHpRef.current - defDrainPerTick * variance,
      );
    }, 200);

    const displayInterval = setInterval(() => {
      setDisplayHp({
        atk: Math.round(atkHpRef.current),
        def: Math.round(defHpRef.current),
      });
    }, 300);

    const pulseInterval = setInterval(() => {
      setLivePulse((p) => !p);
    }, 700);

    return () => {
      clearInterval(drainInterval);
      clearInterval(displayInterval);
      clearInterval(pulseInterval);
    };
  }, [attackerHp, defenderHp, battleDuration, atkMaxHp, defMaxHp]);

  // Drag state
  const [pos, setPos] = useState({
    x: Math.max(20, window.innerWidth / 2 - 220),
    y: Math.max(20, window.innerHeight / 2 - 260),
  });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const s = stateRef.current;

    // Init soldiers
    for (let i = 0; i < 6; i++) {
      s.soldiers.push({
        x: i < 3 ? 20 + i * 18 : W - 20 - (i - 3) * 18,
        y: H * 0.55 + (Math.random() - 0.5) * 20,
        vx: i < 3 ? 0.6 : -0.6,
        side: i < 3 ? "left" : "right",
        frame: 0,
      });
    }
    // Init tanks
    for (let i = 0; i < 2; i++) {
      s.tanks.push({
        x: i === 0 ? 10 : W - 10,
        y: H * 0.7,
        vx: i === 0 ? 0.8 : -0.8,
        side: i === 0 ? "left" : "right",
      });
    }
    // Init jets (3 jets, visual-only, no bombing)
    for (let i = 0; i < 3; i++) {
      s.jets.push({
        x: i === 0 ? 0 : i === 1 ? W : W / 2,
        y: H * (0.15 + i * 0.1),
        vx: i === 0 ? 2 : i === 1 ? -2 : 1.5,
        vy: (Math.random() - 0.5) * 0.3,
        trail: [],
      });
    }

    function spawnExplosion() {
      const x = 60 + Math.random() * (W - 120);
      const y = H * 0.4 + Math.random() * (H * 0.3);
      s.explosions.push({
        x,
        y,
        radius: 0,
        maxRadius: 15 + Math.random() * 25,
        life: 0,
        maxLife: 20 + Math.random() * 15,
      });
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        s.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 0,
          maxLife: 30 + Math.random() * 20,
          color: Math.random() > 0.5 ? "#ff6600" : "#ffcc00",
          size: 2 + Math.random() * 4,
        });
      }
    }

    function draw() {
      s.tick++;

      ctx!.fillStyle = "#1a1008";
      ctx!.fillRect(0, 0, W, H);

      const grd = ctx!.createLinearGradient(0, H * 0.6, 0, H);
      grd.addColorStop(0, "#3d2a0a");
      grd.addColorStop(1, "#1a1008");
      ctx!.fillStyle = grd;
      ctx!.fillRect(0, H * 0.6, W, H * 0.4);

      const skyGrd = ctx!.createLinearGradient(0, 0, 0, H * 0.6);
      skyGrd.addColorStop(0, "#0d0508");
      skyGrd.addColorStop(1, "#2a1010");
      ctx!.fillStyle = skyGrd;
      ctx!.fillRect(0, 0, W, H * 0.6);

      if (s.tick % 40 === 0) spawnExplosion();

      for (let i = s.explosions.length - 1; i >= 0; i--) {
        const e = s.explosions[i];
        e.life++;
        e.radius = (e.life / e.maxLife) * e.maxRadius;
        const alpha = 1 - e.life / e.maxLife;
        ctx!.beginPath();
        ctx!.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,100,0,${alpha * 0.8})`;
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(e.x, e.y, e.radius * 0.5, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,220,50,${alpha})`;
        ctx!.fill();
        if (e.life >= e.maxLife) s.explosions.splice(i, 1);
      }

      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        const alpha = 1 - p.life / p.maxLife;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx!.fillStyle = p.color.replace(")", `,${alpha})`);
        ctx!.fill();
        if (p.life >= p.maxLife) s.particles.splice(i, 1);
      }

      // Jets — visual only, no bombing in battle window
      for (const jet of s.jets) {
        jet.trail.push({ x: jet.x, y: jet.y });
        if (jet.trail.length > 20) jet.trail.shift();
        jet.x += jet.vx;
        jet.y += jet.vy;
        if (jet.x > W + 30) jet.x = -30;
        if (jet.x < -30) jet.x = W + 30;

        for (let i = 0; i < jet.trail.length - 1; i++) {
          const alpha = i / jet.trail.length;
          ctx!.strokeStyle = `rgba(200,200,255,${alpha * 0.5})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(jet.trail[i].x, jet.trail[i].y);
          ctx!.lineTo(jet.trail[i + 1].x, jet.trail[i + 1].y);
          ctx!.stroke();
        }
        ctx!.save();
        ctx!.translate(jet.x, jet.y);
        ctx!.scale(jet.vx > 0 ? 1 : -1, 1);
        ctx!.fillStyle = "#aaaacc";
        ctx!.beginPath();
        ctx!.moveTo(10, 0);
        ctx!.lineTo(-8, -4);
        ctx!.lineTo(-8, 4);
        ctx!.closePath();
        ctx!.fill();
        ctx!.fillStyle = "#8888aa";
        ctx!.beginPath();
        ctx!.moveTo(-2, -2);
        ctx!.lineTo(-6, -10);
        ctx!.lineTo(-8, -2);
        ctx!.closePath();
        ctx!.fill();
        ctx!.restore();
      }

      for (const tank of s.tanks) {
        tank.x += tank.vx;
        const midX = W / 2;
        if (tank.side === "left" && tank.x > midX - 60) tank.vx = 0;
        if (tank.side === "right" && tank.x < midX + 60) tank.vx = 0;

        ctx!.save();
        ctx!.translate(tank.x, tank.y);
        ctx!.scale(tank.side === "left" ? 1 : -1, 1);
        ctx!.fillStyle = tank.side === "left" ? "#4a7c59" : "#7c4a4a";
        ctx!.fillRect(-20, -10, 40, 18);
        ctx!.fillStyle = tank.side === "left" ? "#3a6b48" : "#6b3a3a";
        ctx!.fillRect(-8, -18, 16, 10);
        ctx!.fillStyle = "#333";
        ctx!.fillRect(8, -14, 16, 4);
        ctx!.fillStyle = "#222";
        for (let i = -12; i <= 12; i += 8) {
          ctx!.beginPath();
          ctx!.arc(i, 8, 5, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      }

      for (const sol of s.soldiers) {
        sol.frame = (sol.frame + 0.2) % 4;
        const midX = W / 2;
        if (sol.side === "left" && sol.x < midX - 30) sol.x += sol.vx;
        if (sol.side === "right" && sol.x > midX + 30) sol.x += sol.vx;

        const bobY = Math.sin(sol.frame * Math.PI) * 2;
        ctx!.save();
        ctx!.translate(sol.x, sol.y + bobY);
        ctx!.scale(sol.side === "left" ? 1 : -1, 1);
        ctx!.fillStyle = sol.side === "left" ? "#4a7c59" : "#aa3333";
        ctx!.fillRect(-4, -12, 8, 12);
        ctx!.fillStyle = "#c8a882";
        ctx!.beginPath();
        ctx!.arc(0, -16, 5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = sol.side === "left" ? "#2a5c39" : "#8a1a1a";
        ctx!.fillRect(-5, -21, 10, 6);
        ctx!.fillStyle = "#333";
        ctx!.fillRect(4, -14, 12, 2);
        ctx!.restore();
      }

      if (s.tick % 10 === 0) {
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          s.particles.push({
            x: W / 2 + (Math.random() - 0.5) * 30,
            y: H * 0.55 + (Math.random() - 0.5) * 20,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2 - 1,
            life: 0,
            maxLife: 15,
            color: "#ffffff",
            size: 2,
          });
        }
      }

      if (s.tick % 5 === 0) {
        const sx = 30 + Math.random() * (W - 60);
        s.particles.push({
          x: sx,
          y: H * 0.6,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.8,
          life: 0,
          maxLife: 60 + Math.random() * 40,
          color: "rgb(80,70,60",
          size: 6 + Math.random() * 8,
        });
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPos({
      x: dragRef.current.origX + e.clientX - dragRef.current.startX,
      y: dragRef.current.origY + e.clientY - dragRef.current.startY,
    });
  };
  const handleMouseUp = () => {
    dragRef.current = null;
  };

  const atkRatio = Math.max(0, displayHp.atk / atkMaxHp);
  const defRatio = Math.max(0, displayHp.def / defMaxHp);
  const atkColor = getBarColor(atkRatio);
  const defColor = getBarColor(defRatio);
  const atkGlow = getBarGlow(atkRatio);
  const defGlow = getBarGlow(defRatio);

  // Format countdown
  const countdownMins = Math.floor(countdown / 60);
  const countdownSecs = countdown % 60;
  const countdownStr = `${countdownMins}:${String(countdownSecs).padStart(2, "0")}`;
  const countdownUrgent = countdown <= 30;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 400,
        zIndex: 9999,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 0 30px rgba(255,80,0,0.7), 0 0 60px rgba(200,0,0,0.4)",
        border: "2px solid rgba(255,100,30,0.8)",
        background: "#0d0508",
        userSelect: "none",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-ocid="battle.panel"
    >
      {/* Title bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          cursor: "grab",
          background: "linear-gradient(90deg, #1a0505, #2d0a0a)",
          borderBottom: "1px solid rgba(255,80,0,0.5)",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: 2,
              color: "#ff4444",
              textShadow: "0 0 8px #ff0000, 0 0 16px #ff0000",
              animation: "battleGlow 1s ease-in-out infinite alternate",
            }}
          >
            ⚔ BATTLE
          </span>
          {/* Pulsing LIVE dot */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ff2222",
                boxShadow: livePulse
                  ? "0 0 6px #ff0000, 0 0 12px #ff0000"
                  : "none",
                transition: "box-shadow 0.3s ease",
              }}
            />
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 1,
                color: livePulse ? "#ff4444" : "#aa2222",
                transition: "color 0.3s ease",
              }}
            >
              LIVE
            </span>
          </div>
          {/* Countdown timer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 6,
              background: countdownUrgent
                ? "rgba(255,30,30,0.25)"
                : "rgba(255,150,0,0.15)",
              border: `1px solid ${countdownUrgent ? "rgba(255,60,60,0.6)" : "rgba(255,150,0,0.4)"}`,
            }}
          >
            <span style={{ fontSize: 10 }}>⏱</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 900,
                fontFamily: "monospace",
                color: countdownUrgent ? "#ff4444" : "#ffaa22",
                textShadow: countdownUrgent
                  ? "0 0 6px #ff2200"
                  : "0 0 4px #ff8800",
                letterSpacing: 1,
                animation: countdownUrgent
                  ? "battleGlow 0.4s ease-in-out infinite alternate"
                  : undefined,
              }}
            >
              {countdownStr}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-ocid="battle.close_button"
          style={{
            background: "rgba(200,30,30,0.5)",
            border: "1px solid rgba(255,80,80,0.5)",
            borderRadius: 4,
            color: "#ffaaaa",
            cursor: "pointer",
            padding: "2px 8px",
            fontSize: 14,
            fontWeight: "bold",
          }}
        >
          ✕
        </button>
      </div>

      {/* Battle result banner */}
      {battleResult && (
        <div
          style={{
            background:
              battleResult === "attacker"
                ? "rgba(20,100,20,0.95)"
                : "rgba(100,20,20,0.95)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
            padding: "6px 12px",
            textAlign: "center",
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: 1,
            color: battleResult === "attacker" ? "#44ff66" : "#ff5544",
            textShadow:
              battleResult === "attacker"
                ? "0 0 8px #00ff44"
                : "0 0 8px #ff2200",
          }}
          data-ocid="battle.success_state"
        >
          {battleResult === "attacker"
            ? `⚔ ${attackerName} WINS!`
            : `🛡 ${defenderName} DEFENDED!`}
        </div>
      )}

      {/* Combatant names */}
      <div
        style={{
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "5px 12px",
          fontSize: 12,
          fontWeight: 700,
          borderBottom: "1px solid rgba(255,60,0,0.3)",
        }}
      >
        <span style={{ color: "#66cc55" }}>⚔ {attackerName}</span>
        <span style={{ color: "#ff6644", fontSize: 10 }}>VS</span>
        <span style={{ color: "#ff4444" }}>🛡 {defenderName}</span>
      </div>

      {/* Battle canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={220}
        style={{ display: "block" }}
        data-ocid="battle.canvas_target"
      />

      {/* Live HP Bars */}
      <div
        style={{
          background: "rgba(0,0,0,0.85)",
          borderTop: "1px solid rgba(255,60,0,0.3)",
          padding: "10px 12px",
          display: "flex",
          alignItems: "stretch",
          gap: 0,
        }}
        data-ocid="battle.panel"
      >
        {/* Attacker side */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: atkColor,
              textShadow: atkGlow,
              marginBottom: 4,
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            ⚔ {attackerName}
          </div>
          <div
            style={{
              height: 10,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 5,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${atkRatio * 100}%`,
                background: atkColor,
                boxShadow: atkGlow,
                borderRadius: 5,
                transition: "width 0.28s ease, background 0.5s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(200,200,200,0.8)",
              fontWeight: 700,
              letterSpacing: 0.3,
              fontFamily: "monospace",
            }}
          >
            {displayHp.atk.toLocaleString()} / {atkMaxHp.toLocaleString()}
          </div>
          {attackerTroops !== undefined && (
            <div
              style={{
                fontSize: 9,
                color: "rgba(150,220,150,0.7)",
                marginTop: 2,
              }}
            >
              👥 {attackerTroops.toLocaleString()} troops
            </div>
          )}
        </div>

        {/* VS divider */}
        <div
          style={{
            width: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "rgba(255,100,50,0.8)",
              textShadow: "0 0 6px rgba(255,80,0,0.6)",
              letterSpacing: 1,
            }}
          >
            VS
          </span>
        </div>

        {/* Defender side */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: defColor,
              textShadow: defGlow,
              marginBottom: 4,
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "right",
            }}
          >
            {defenderName} 🛡
          </div>
          <div
            style={{
              height: 10,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 5,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              marginBottom: 4,
              direction: "rtl",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${defRatio * 100}%`,
                background: defColor,
                boxShadow: defGlow,
                borderRadius: 5,
                transition: "width 0.28s ease, background 0.5s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 9,
              color: "rgba(200,200,200,0.8)",
              fontWeight: 700,
              letterSpacing: 0.3,
              fontFamily: "monospace",
              textAlign: "right",
            }}
          >
            {displayHp.def.toLocaleString()} / {defMaxHp.toLocaleString()}
          </div>
          {defenderTroops !== undefined && (
            <div
              style={{
                fontSize: 9,
                color: "rgba(220,150,150,0.7)",
                marginTop: 2,
                textAlign: "right",
              }}
            >
              👥 {defenderTroops.toLocaleString()} troops
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes battleGlow {
          from { text-shadow: 0 0 6px #ff0000, 0 0 12px #ff0000; }
          to { text-shadow: 0 0 14px #ff6600, 0 0 28px #ff4400; }
        }
      `}</style>
    </div>
  );
}
