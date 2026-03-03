import { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { useBoardContext } from "../context/useBoardContext";
import type { BoardList } from "../context/BoardContext";
import { Card } from "./Card";
import { CardModal } from "./CardModal";

interface ListProps {
  list: BoardList;
}

export function List({ list }: ListProps) {
  const { state, newSession } = useBoardContext();
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const cards = list.cardIds.map((id) => state.cards[id]).filter(Boolean);
  const openCard = openCardId ? state.cards[openCardId] : null;

  return (
    <>
      <div
        className="flex flex-col w-full rounded-2xl shadow-md"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-sm font-bold" style={{ color: "#1f2937" }}>
            {list.title}
          </span>
          <button
            className="px-1 text-base leading-none transition-opacity hover:opacity-60"
            style={{ color: "#9ca3af" }}
            title="List options"
          >
            ···
          </button>
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
                  style={{ color: "#9ca3af" }}
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
          style={{ borderTop: "1px solid #f3f4f6" }}
        >
          <button
            onClick={newSession}
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-60"
            style={{ color: "#6b7280" }}
          >
            <span className="text-base leading-none">+</span>
            <span>Add a card</span>
          </button>
          <button
            className="transition-opacity hover:opacity-60"
            style={{ color: "#9ca3af" }}
            title="Card template"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
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
