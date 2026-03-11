import { useState, useEffect, useRef } from "react";
import { X, Terminal, Trash2 } from "lucide-react";
import { useBoardContext } from "../context/useBoardContext";
import type { BoardCard, BoardList } from "../context/BoardContext";
import type { SessionStatus } from "../messageProtocol";

const STATUS_CYCLE: Record<SessionStatus, SessionStatus> = {
  running: "thinking",
  thinking: "idle",
  idle: "error",
  error: "idle",
};

const STATUS_MAP: Record<SessionStatus, { label: string; color: string }> = {
  running: { label: "Running", color: "#f59e0b" },
  thinking: { label: "Thinking", color: "#818cf8" },
  idle: { label: "Idle", color: "#858585" },
  error: { label: "Error", color: "#ef4444" },
};

interface CardModalProps {
  card: BoardCard;
  list: BoardList;
  onClose: () => void;
}

export function CardModal({ card, list, onClose }: CardModalProps) {
  const { renameCard, setNote, setStatus, endSession, focusSession } =
    useBoardContext();

  const [name, setName] = useState(card.name);
  const [note, setNote_] = useState(card.note);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const commitName = () => {
    if (name.trim() && name.trim() !== card.name) {
      renameCard(card.id, name.trim());
    } else {
      setName(card.name);
    }
  };

  const commitNote = () => {
    if (note !== card.note) setNote(card.id, note);
  };

  const { label, color } = STATUS_MAP[card.status] ?? STATUS_MAP.idle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="relative w-80 rounded-lg shadow-xl p-4 flex flex-col gap-3"
        style={{
          background: "var(--vscode-editor-background)",
          border: "1px solid var(--vscode-widget-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
            style={{ background: list.color + "22", color: list.color }}
          >
            {list.title}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: "var(--vscode-foreground)" }}
          >
            <X size={14} />
          </button>
        </div>

        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") nameRef.current?.blur();
          }}
          className="text-sm font-semibold bg-transparent rounded px-2 py-1 outline-none border border-transparent focus:border-(--vscode-focusBorder)"
          style={{ color: "var(--vscode-foreground)" }}
        />

        {/* Status toggle */}
        <div className="flex items-center gap-2">
          <span
            className="text-[11px]"
            style={{ color: "var(--vscode-descriptionForeground)" }}
          >
            Status
          </span>
          <button
            onClick={() => setStatus(card.id, STATUS_CYCLE[card.status])}
            className="text-[11px] px-2 py-0.5 rounded cursor-pointer hover:opacity-70 transition-opacity"
            style={{ background: color + "22", color }}
          >
            {label}
          </button>
        </div>

        <div>
          <div
            className="text-[11px] mb-1"
            style={{ color: "var(--vscode-descriptionForeground)" }}
          >
            Note
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote_(e.target.value)}
            onBlur={commitNote}
            placeholder="Add a note..."
            rows={3}
            className="w-full text-xs rounded px-2 py-1 resize-none outline-none"
            style={{
              background: "var(--vscode-input-background)",
              color: "var(--vscode-input-foreground)",
              border: "1px solid var(--vscode-input-border)",
            }}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              focusSession(card.id);
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded flex-1 justify-center hover:opacity-80 transition-opacity"
            style={{
              background: "var(--vscode-button-background)",
              color: "var(--vscode-button-foreground)",
            }}
          >
            <Terminal size={12} /> Focus Terminal
          </button>
          <button
            onClick={() => {
              endSession(card.id);
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
            style={{
              background: "var(--vscode-errorForeground)",
              color: "#fff",
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
