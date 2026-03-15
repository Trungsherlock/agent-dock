import { useState, useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { useBoardContext } from "../context/useBoardContext";
import type { BoardCard, BoardList } from "../context/BoardContext";
import type { SessionStatus } from "../messageProtocol";

const STATUS_MAP: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  running:  { label: "Running",  color: "#00d4aa", bg: "rgba(0,212,170,0.1)"   },
  thinking: { label: "Thinking", color: "#818cf8", bg: "rgba(129,140,248,0.1)" },
  idle:     { label: "Idle",     color: "#f0a500", bg: "rgba(240,165,0,0.1)"   },
  error:    { label: "Error",    color: "#ff4d6a", bg: "rgba(255,77,106,0.1)"  },
};

interface CardModalProps {
  card: BoardCard;
  list: BoardList;
  onClose: () => void;
}

export function CardModal({ card, list, onClose }: CardModalProps) {
  const { renameCard, setNote, endSession, focusSession } = useBoardContext();

  const [name, setName] = useState(card.name);
  const [note, setNote_] = useState(card.note);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const confirmRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== card.name) renameCard(card.id, trimmed);
    else setName(card.name);
  };

  const commitNote = () => { if (note !== card.note) setNote(card.id, note); };

  const { label, color, bg } = STATUS_MAP[card.status] ?? STATUS_MAP.idle;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "340px",
          background: "#12161f",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "14px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              padding: "2px 9px",
              borderRadius: "99px",
              background: list.color + "18",
              color: list.color,
              border: `1px solid ${list.color}35`,
            }}
          >
            {list.title}
          </span>
          <button
            onClick={onClose}
            style={{
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#6b7a96",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,77,106,0.12)";
              e.currentTarget.style.color = "#ff4d6a";
              e.currentTarget.style.borderColor = "rgba(255,77,106,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "#6b7a96";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="20px"
              viewBox="0 -960 960 960"
              width="20px"
              fill="#FFFFFF"
            >
              <path d="m291-240-51-51 189-189-189-189 51-51 189 189 189-189 51 51-189 189 189 189-51 51-189-189-189 189Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Name input */}
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename();
                if (e.key === "Escape") setName(card.name);
              }}
              style={{
                flex: 1,
                background: "#161b2e",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#dde1f0",
                fontFamily: "monospace",
                fontSize: "13px",
                fontWeight: 600,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(129,140,248,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            />
            {name.trim() !== card.name && name.trim() !== "" && (
              <button
                onClick={confirmRename}
                title="Confirm rename"
                style={{
                  flexShrink: 0,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(0,212,170,0.12)",
                  border: "1px solid rgba(0,212,170,0.3)",
                  color: "#00d4aa",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  fontWeight: 700,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,212,170,0.22)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0,212,170,0.12)";
                }}
              >
                ✓
              </button>
            )}
          </div>

          {/* Status toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.6px",
                textTransform: "uppercase",
                color: "#6b7a96",
                flexShrink: 0,
              }}
            >
              Status
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "10px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "99px",
                background: card.hasTerminal ? bg : "rgba(107,122,150,0.08)",
                color: card.hasTerminal ? color : "#6b7a96",
                border: `1px solid ${card.hasTerminal ? color : "#6b7a96"}35`,
                letterSpacing: "0.3px",
              }}
            >
              {card.hasTerminal ? label : "Offline"}
            </span>
          </div>

          {/* Note */}
          <div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.6px",
                textTransform: "uppercase",
                color: "#6b7a96",
                marginBottom: "6px",
              }}
            >
              Note
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote_(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              style={{
                width: "100%",
                background: "#161b2e",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#b0bbd4",
                fontFamily: "monospace",
                fontSize: "11px",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(129,140,248,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                commitNote();
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                focusSession(card.id);
                onClose();
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: "8px",
                background: "rgba(129,140,248,0.12)",
                border: "1px solid rgba(129,140,248,0.3)",
                color: "#818cf8",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(129,140,248,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(129,140,248,0.12)";
              }}
            >
              <Terminal size={12} />
              Focus Terminal
            </button>
            <button
              onClick={() => {
                endSession(card.id);
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(255,77,106,0.1)",
                border: "1px solid rgba(255,77,106,0.25)",
                color: "#ff4d6a",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,77,106,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,77,106,0.1)";
              }}
              title="End session"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#FFFFFF"
              >
                <path d="m680-160 120-120-28-28-72 72v-164h-40v164l-72-72-28 28 120 120Zm-560 0v-640l572 240h-12q-35 0-66 8t-60 22L200-680v140l240 60-240 60v140l216-92q-8 23-12 45.5t-4 46.5v2L120-160Zm418.5 21.5Q480-197 480-280t58.5-141.5Q597-480 680-480t141.5 58.5Q880-363 880-280t-58.5 141.5Q763-80 680-80t-141.5-58.5ZM200-372v-308 400-92Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
