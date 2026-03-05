import { useState, useRef } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { useBoardContext } from "../context/useBoardContext";
import type { BoardList } from "../context/BoardContext";
import { Card } from "./Card";
import { CardModal } from "./CardModal";

interface ListProps {
  list: BoardList;
}

export function List({ list }: ListProps) {
  const { state, newSession, renameCohort, deleteCohort } = useBoardContext();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(list.title);
  const inputRef = useRef<HTMLInputElement>(null);

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
        className="flex flex-col w-full rounded-lg shadow-md"
        style={{ backgroundColor: "#1e1e2e", border: "1px solid #2a2a3e" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {editing ? (
            <input
              ref={inputRef}
              autoFocus
              className="flex-1 text-sm font-bold rounded px-1 border"
              style={{
                color: "#e2e8f0",
                background: "transparent",
                borderColor: "#3d3d5c",
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
              className="text-sm font-bold select-none"
              style={{
                color: "#e2e8f0",
                cursor: isUncategorized ? "default" : "pointer",
              }}
              onDoubleClick={startEdit}
              title={isUncategorized ? undefined : "Double-click to rename"}
            >
              {list.title}
            </span>
          )}
          {!isUncategorized && (
            <button
              onClick={handleDelete}
              className="ml-2 text-xs leading-none transition-opacity hover:opacity-60"
              style={{ color: "#6b7a99" }}
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
              className="flex flex-col px-3"
              style={{
                minHeight: "32px",
                backgroundColor: snapshot.isDraggingOver
                  ? list.color + "18"
                  : "transparent",
                transition: "background-color 0.15s ease",
              }}
            >
              {cards.length === 0 && !snapshot.isDraggingOver && (
                <div
                  className="text-xs text-center py-3 italic"
                  style={{ color: "#6b7a99" }}
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
          className="flex items-center justify-between px-4 py-2 mt-1"
          style={{ borderTop: "1px solid #2a2a3e" }}
        >
          <button
            onClick={newSession}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-60"
            style={{ color: "#8892a4" }}
          >
            <span className="text-base leading-none">+</span>
            <span>Add a card</span>
          </button>
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
