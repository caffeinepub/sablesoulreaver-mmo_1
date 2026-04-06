import React, { useState, useEffect } from "react";
import type { AttackNotification as AttackNotifType } from "../types/game";

interface Props {
  notifications: AttackNotifType[];
}

interface NotifState {
  notif: AttackNotifType;
  visible: boolean;
}

export function AttackNotification({ notifications }: Props) {
  const [states, setStates] = useState<NotifState[]>([]);

  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[notifications.length - 1];
    setStates((prev) => {
      if (prev.find((s) => s.notif.id === latest.id)) return prev;
      return [...prev, { notif: latest, visible: true }];
    });

    const fadeTimer = setTimeout(() => {
      setStates((prev) =>
        prev.map((s) =>
          s.notif.id === latest.id ? { ...s, visible: false } : s,
        ),
      );
    }, 1600);

    const removeTimer = setTimeout(() => {
      setStates((prev) => prev.filter((s) => s.notif.id !== latest.id));
    }, 2100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [notifications]);

  if (states.length === 0) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-50">
      {states.map(({ notif, visible }) => (
        <div
          key={notif.id}
          className="mb-2 px-6 py-3 rounded-lg text-center"
          style={{
            background: "rgba(180,0,0,0.85)",
            border: "2px solid #ff4444",
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            textShadow: "0 0 8px rgba(255,100,0,0.8)",
            boxShadow: "0 0 20px rgba(255,0,0,0.5)",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.5s ease-out",
            letterSpacing: 1,
          }}
        >
          {notif.message}
        </div>
      ))}
    </div>
  );
}
