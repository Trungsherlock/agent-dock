import { useState, useRef, useEffect } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { useBoardContext } from "../context/useBoardContext";
import type { BoardList } from "../context/BoardContext";
import { Card } from "./Card";
import { CardModal } from "./CardModal";

interface ListProps {
  list: BoardList;
}

export function List({ list }: ListProps) {
  const { state, renameCohort, deleteCohort, archivedSessions, fetchArchivedSessions, addExistingSession, openAddAgentPanel } = useBoardContext();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(list.title);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
        setShowArchived(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddMenu]);

  const cards = list.cardIds.map((id) => state.cards[id]).filter(Boolean);
  const openCard = openCardId ? state.cards[openCardId] : null;
  const isUncategorized = list.id === "uncategorized";

  const startEdit = () => {
    if (isUncategorized) return;
    setEditLabel(list.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const saveEdit = () => {
    const label = editLabel.trim();
    if (label && label !== list.title) {
      renameCohort(list.id, label);
    }
    setEditing(false);
  };

  const handleDelete = () => {
    const msg =
      cards.length > 0
        ? `Delete "${list.title}"? ${cards.length} session(s) will move to Uncategorized.`
        : `Delete cohort "${list.title}"?`;
    if (window.confirm(msg)) {
      deleteCohort(list.id);
    }
  };

  return (
    <>
      <div
        className="flex flex-col w-full"
        style={{
          backgroundColor: "#141720",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3.5 py-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {editing ? (
            <input
              ref={inputRef}
              autoFocus
              className="flex-1 rounded px-1 border"
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: "#8891a8",
                background: "transparent",
                borderColor: "rgba(255,255,255,0.15)",
              }}
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              onBlur={saveEdit}
            />
          ) : (
            <span
              className="flex-1 select-none"
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: "#8891a8",
                cursor: isUncategorized ? "default" : "pointer",
              }}
              onDoubleClick={startEdit}
              title={isUncategorized ? undefined : "Double-click to rename"}
            >
              {list.title}
            </span>
          )}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              color: "#4e566a",
              background: "#252c3d",
              padding: "1px 7px",
              borderRadius: "99px",
            }}
          >
            {cards.length}
          </span>
          {!isUncategorized && (
            <button
              onClick={handleDelete}
              className="text-xs leading-none transition-opacity hover:opacity-60"
              style={{ color: "#4e566a" }}
              title="Delete cohort"
            >
              ✕
            </button>
          )}
        </div>

        {/* Cards */}
        <Droppable droppableId={list.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: "32px",
                backgroundColor: snapshot.isDraggingOver
                  ? list.color + "10"
                  : "transparent",
                transition: "background-color 0.15s ease",
              }}
            >
              {cards.length === 0 && !snapshot.isDraggingOver && (
                <div
                  className="text-xs text-center py-4 italic"
                  style={{ color: "#4e566a" }}
                >
                  No agents here
                </div>
              )}
              {cards.map((card, index) => (
                <Card
                  key={card.id}
                  card={card}
                  list={list}
                  index={index}
                  onClick={() => setOpenCardId(card.id)}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Footer */}
        <div
          className="relative flex items-center px-3.5 py-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          ref={menuRef}
        >
          <button
            onClick={() => setShowAddMenu((v) => !v)}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-60"
            style={{ fontFamily: "monospace", fontSize: "10px", color: "#4e566a" }}
          >
            <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span>
            <span>Add a card</span>
          </button>

          {showAddMenu && (
            <div
              className="absolute bottom-full left-0 mb-1 z-10 rounded overflow-hidden"
              style={{
                backgroundColor: "#1e2330",
                border: "1px solid rgba(255,255,255,0.1)",
                minWidth: "160px",
              }}
            >
              {!showArchived ? (
                <>
                  <button
                    className="w-full text-left px-3 py-2 transition-colors hover:bg-white/5"
                    style={{ fontFamily: "monospace", fontSize: "10px", color: "#8891a8" }}
                    onClick={() => {
                      fetchArchivedSessions();
                      setShowArchived(true);
                    }}
                  >
                    Existing agent
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 transition-colors hover:bg-white/5"
                    style={{ fontFamily: "monospace", fontSize: "10px", color: "#8891a8" }}
                    onClick={() => { openAddAgentPanel(list.id); setShowAddMenu(false); }}
                  >
                    New agent
                  </button>
                </>
              ) : archivedSessions.length === 0 ? (
                <div
                  className="px-3 py-2"
                  style={{ fontFamily: "monospace", fontSize: "10px", color: "#4e566a" }}
                >
                  No archived agents
                </div>
              ) : (
                archivedSessions.map((s) => (
                  <button
                    key={s.id}
                    className="w-full text-left px-3 py-2 transition-colors hover:bg-white/5"
                    style={{ fontFamily: "monospace", fontSize: "10px", color: "#8891a8" }}
                    onClick={() => { addExistingSession(s.id); setShowAddMenu(false); setShowArchived(false); }}
                  >
                    {s.name}
                    <span style={{ color: "#4e566a", marginLeft: "6px" }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {openCard && (
        <CardModal
          card={openCard}
          list={list}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </>
  );
}
