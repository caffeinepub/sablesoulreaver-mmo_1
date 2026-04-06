import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { LocalClan } from "../types/game";

interface ClanChatMessage {
  id: string;
  username: string;
  clanId: string;
  content: string;
  imageDataUrl?: string;
  timestamp: number;
}

interface Props {
  username: string;
  myClan: LocalClan;
  onClose: () => void;
}

function loadMessages(clanId: string): ClanChatMessage[] {
  try {
    const raw = localStorage.getItem(`clanChat_${clanId}`);
    if (!raw) return [];
    return JSON.parse(raw) as ClanChatMessage[];
  } catch {
    return [];
  }
}

function saveMessages(clanId: string, msgs: ClanChatMessage[]) {
  try {
    // Keep last 200 messages
    const trimmed = msgs.slice(-200);
    localStorage.setItem(`clanChat_${clanId}`, JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }
}

export function ClanChatPanel({ username, myClan, onClose }: Props) {
  const [messages, setMessages] = useState<ClanChatMessage[]>(() =>
    loadMessages(myClan.id),
  );
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync from localStorage periodically (simulating multiplayer)
  useEffect(() => {
    const t = setInterval(() => {
      const latest = loadMessages(myClan.id);
      setMessages(latest);
    }, 2000);
    return () => clearInterval(t);
  }, [myClan.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (content: string, imageDataUrl?: string) => {
    if (!content.trim() && !imageDataUrl) return;
    const msg: ClanChatMessage = {
      id: `cm_${Date.now()}_${Math.random()}`,
      username,
      clanId: myClan.id,
      content: content.trim(),
      imageDataUrl,
      timestamp: Date.now(),
    };
    const updated = [...messages, msg];
    setMessages(updated);
    saveMessages(myClan.id, updated);
    setInput("");
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      sendMessage("", dataUrl);
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-4"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="rounded-xl flex flex-col"
        style={{
          width: 320,
          height: 480,
          background: "#0c1a22",
          border: `2px solid ${myClan.color}55`,
          color: "white",
          pointerEvents: "all",
          boxShadow: `0 0 24px ${myClan.color}33`,
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-4 py-3 flex-shrink-0"
          style={{
            borderBottom: `1px solid ${myClan.color}33`,
            background: "rgba(255,255,255,0.03)",
            borderRadius: "10px 10px 0 0",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: myClan.color }}
            />
            <span className="text-sm font-bold" style={{ color: myClan.color }}>
              💬 {myClan.name} Chat
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none"
            data-ocid="clanchat.close_button"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
          style={{ scrollbarWidth: "thin" }}
          data-ocid="clanchat.panel"
        >
          {messages.length === 0 && (
            <div
              className="text-center text-xs py-8"
              style={{ color: "#555" }}
              data-ocid="clanchat.empty_state"
            >
              No messages yet. Start the conversation!
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.username === username;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {!isMe && (
                  <span
                    className="text-xs mb-0.5 font-semibold"
                    style={{ color: myClan.color }}
                  >
                    {msg.username}
                  </span>
                )}
                <div
                  className="rounded-xl px-3 py-2 max-w-[85%]"
                  style={{
                    background: isMe
                      ? `${myClan.color}33`
                      : "rgba(255,255,255,0.08)",
                    border: isMe
                      ? `1px solid ${myClan.color}55`
                      : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {msg.content && (
                    <p
                      className="text-xs break-words"
                      style={{ color: isMe ? "#fff" : "#ddd" }}
                    >
                      {msg.content}
                    </p>
                  )}
                  {msg.imageDataUrl && (
                    <img
                      src={msg.imageDataUrl}
                      alt=""
                      className="rounded-lg mt-1"
                      style={{
                        maxWidth: 200,
                        maxHeight: 200,
                        objectFit: "cover",
                      }}
                    />
                  )}
                </div>
                <span className="text-xs mt-0.5" style={{ color: "#444" }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Input area */}
        <div
          className="flex-shrink-0 px-3 py-2 flex gap-2 items-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <input
            className="flex-1 text-xs px-3 py-2 rounded-xl"
            placeholder="Message your clan..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            data-ocid="clanchat.input"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: `1px solid ${myClan.color}33`,
              color: "white",
              outline: "none",
              fontSize: 13,
            }}
          />
          {/* Photo button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: `1px solid ${myClan.color}33`,
              fontSize: 16,
            }}
            title="Share photo"
            data-ocid="clanchat.upload_button"
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhoto}
          />
          {/* Send button */}
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={{
              background: input.trim()
                ? `${myClan.color}44`
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${input.trim() ? `${myClan.color}66` : "rgba(255,255,255,0.1)"}`,
              color: input.trim() ? myClan.color : "#555",
              fontSize: 16,
            }}
            data-ocid="clanchat.submit_button"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
