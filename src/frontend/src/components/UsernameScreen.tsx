import React, { useState } from "react";

interface Props {
  onConfirm: (username: string) => void;
}

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: `p-${i}`,
  width: 2 + ((i * 7) % 3),
  height: 2 + ((i * 5) % 3),
  left: (i * 33.3) % 100,
  top: (i * 17.7) % 100,
  color: i % 2 === 0 ? "100,200,50" : "150,80,220",
  opacity: 0.3 + ((i * 0.07) % 0.5),
  duration: 2 + ((i * 0.3) % 3),
  delay: (i * 0.1) % 2,
}));

export function UsernameScreen({ onConfirm }: Props) {
  const [username, setUsername] = useState(
    localStorage.getItem("ssmmo_username") || "",
  );
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a username");
      return;
    }
    if (trimmed.length > 20) {
      setError("Username must be 20 characters or less");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError("Username can only contain letters, numbers, _ and -");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at center, #0d1f05 0%, #050d02 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.width,
              height: p.height,
              left: `${p.left}%`,
              top: `${p.top}%`,
              background: `rgba(${p.color},${p.opacity})`,
              animation: `pulse ${p.duration}s infinite ${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-lg">
        {/* Dragon Logo */}
        <div
          style={{
            filter:
              "drop-shadow(0 0 24px rgba(160,60,220,0.7)) drop-shadow(0 0 48px rgba(100,200,50,0.35))",
            marginBottom: "2rem",
          }}
        >
          <img
            src="/assets/generated/sablesoulreaver-dragon-logo.dim_800x400.png"
            alt="SableSoulreaver MMO"
            style={{
              width: "100%",
              maxWidth: "600px",
              display: "block",
            }}
          />
        </div>

        <div
          className="w-full rounded-2xl p-6"
          style={{
            background: "rgba(5,15,2,0.9)",
            border: "1px solid rgba(100,200,50,0.3)",
            boxShadow: "0 0 30px rgba(100,200,50,0.15)",
          }}
        >
          <h2
            className="text-xl font-bold text-center mb-1"
            style={{
              color: "#7DCF45",
              textShadow: "0 0 10px rgba(125,207,69,0.5)",
            }}
          >
            Enter the Realm
          </h2>
          <p className="text-xs text-center mb-4" style={{ color: "#666" }}>
            Choose your warrior name
          </p>

          <input
            data-ocid="username.input"
            className="w-full px-4 py-3 rounded-lg text-base mb-1"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${error ? "#ff4444" : "rgba(100,200,50,0.4)"}`,
              color: "white",
              outline: "none",
            }}
            placeholder="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            maxLength={20}
          />

          {error && (
            <div
              className="text-xs mb-2"
              data-ocid="username.error_state"
              style={{ color: "#ff4444" }}
            >
              {error}
            </div>
          )}
          <div className="text-xs text-right mb-4" style={{ color: "#555" }}>
            {username.length}/20
          </div>

          <button
            type="button"
            data-ocid="username.submit_button"
            onClick={handleSubmit}
            className="w-full py-3 rounded-lg font-bold text-base"
            style={{
              background: "linear-gradient(135deg, #2a6010, #3a8a18)",
              color: "white",
              textShadow: "0 0 8px rgba(125,207,69,0.6)",
              boxShadow: "0 4px 20px rgba(60,140,20,0.4)",
              letterSpacing: 1,
            }}
          >
            ▶ PLAY NOW
          </button>
        </div>
      </div>
    </div>
  );
}
