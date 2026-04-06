import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "../types/game";

interface Props {
  messages: ChatMessage[];
  username: string;
  onSend: (msg: string) => void;
}

export function ChatBox({ messages, onSend }: Props) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message array ref change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div
      className="absolute top-0 left-0 right-0 z-30"
      style={{
        background: "rgba(5,15,2,0.88)",
        borderBottom: "1px solid rgba(100,200,50,0.3)",
      }}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-1 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        style={{
          borderBottom: expanded ? "1px solid rgba(100,200,50,0.2)" : "none",
          background: "transparent",
          color: "inherit",
        }}
      >
        <span className="text-xs font-bold" style={{ color: "#7DCF45" }}>
          CHAT
        </span>
        <span className="text-xs" style={{ color: "#7DCF45" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <>
          <div
            ref={listRef}
            className="overflow-y-auto px-3 py-1"
            style={{ maxHeight: 120, fontSize: 11 }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  color: "rgba(150,200,80,0.4)",
                  fontStyle: "italic",
                  fontSize: 10,
                }}
              >
                No messages yet...
              </div>
            )}
            {messages
              .filter((msg) => !msg.content.startsWith("SSMMO_INVITE:"))
              .map((msg) => (
                <div key={msg.id} className="flex gap-2 mb-0.5">
                  <span style={{ color: "#aaa", flexShrink: 0, fontSize: 9 }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    style={{
                      color: "#7DCF45",
                      fontWeight: "bold",
                      flexShrink: 0,
                    }}
                  >
                    {msg.username}:
                  </span>
                  <span style={{ color: "#ddd" }}>{msg.content}</span>
                </div>
              ))}
          </div>

          <div className="flex gap-1 px-2 pb-2">
            <input
              className="flex-1 text-xs px-2 py-1 rounded"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(100,200,50,0.3)",
                color: "white",
                outline: "none",
              }}
              placeholder="Type message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              maxLength={200}
            />
            <button
              type="button"
              onClick={handleSend}
              className="px-3 py-1 rounded text-xs font-bold"
              style={{ background: "#3a7a10", color: "white" }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
