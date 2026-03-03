import { Draggable } from "@hello-pangea/dnd";
import type { BoardCard, BoardList } from "../context/BoardContext";
import { useBoardContext } from "../context/useBoardContext";

const AVATAR_COLORS = [
  "#f97316",
  "#8b5cf6",
  "#3b82f6",
  "#22c55e",
  "#ec4899",
  "#14b8a6",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface CardProps {
  card: BoardCard;
  list: BoardList;
  index: number;
  onClick: () => void;
}

export function Card({ card, list, index, onClick }: CardProps) {
  const { focusSession } = useBoardContext();

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.9 : 1,
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            marginBottom: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            cursor: "pointer",
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          {/* Tall color banner */}
          <div style={{ height: "40px", backgroundColor: list.color }} />

          <div style={{ padding: "10px 12px 10px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#1f2937",
                marginBottom: "8px",
                lineHeight: 1.4,
              }}
            >
              {card.name}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Eye / focus button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    focusSession(card.id);
                  }}
                  title="Focus session"
                  style={{
                    color: "#9ca3af",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
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
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>

                {/* Date badge */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    padding: "2px 7px",
                    backgroundColor: "#fee2e2",
                    color: "#ef4444",
                    borderRadius: "6px",
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDate(card.createdAt)}
                </span>
              </div>

              {/* Avatar */}
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: avatarColor(card.name),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "9px",
                  fontWeight: 700,
                  border: "2px solid #ffffff",
                  flexShrink: 0,
                }}
                title={card.name}
              >
                {initials(card.name)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
