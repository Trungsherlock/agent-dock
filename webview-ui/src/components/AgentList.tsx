import { useState, useRef, useEffect } from "react";
import { Droppable, type DraggableProvidedDraggableProps, type DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { useBoardContext } from "../context/useBoardContext";
import type { BoardList } from "../context/BoardContext";
import { AgentCard } from "./AgentCard";
import { AgentCardModal } from "./AgentCardModal";

interface ListProps {
  list: BoardList;
  innerRef?: (element?: HTMLElement | null) => void;
  draggableProps?: DraggableProvidedDraggableProps;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export function List({ list, innerRef, draggableProps, dragHandleProps }: ListProps) {
  const { state, renameCohort, deleteCohort, archivedSessions, fetchArchivedSessions, addExistingSession, newSession } = useBoardContext();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(list.title);
  const [collapsed, setCollapsed] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [compact, setCompact] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < 180);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const handleDelete = () => setShowDeletePopup(true);

  return (
    <>
      <div
        ref={(el) => {
          containerRef.current = el;
          innerRef?.(el);
        }}
        {...draggableProps}
        className="flex flex-col w-full"
        style={{
          backgroundColor: "#12161f",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          ...draggableProps?.style,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{
            borderBottom: collapsed
              ? "none"
              : "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            borderRadius: collapsed ? "14px" : "14px 14px 0 0",
          }}
        >
          {/* Drag handle */}
          <div
            {...(dragHandleProps ?? {})}
            style={{
              display: "flex",
              alignItems: "center",
              color: "#4e5a72",
              cursor: "grab",
              flexShrink: 0,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="9" cy="5" r="1.5" />
              <circle cx="15" cy="5" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="19" r="1.5" />
              <circle cx="15" cy="19" r="1.5" />
            </svg>
          </div>
          {/* Color dot */}
          {/* <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: list.color,
              flexShrink: 0,
              boxShadow: `0 0 6px ${list.color}80`,
            }}
          /> */}

          {editing ? (
            <input
              ref={inputRef}
              autoFocus
              className="flex-1 rounded px-1 border"
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: "#c8cedf",
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
                fontWeight: 700,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                color: "#b0bbd4",
                cursor: isUncategorized ? "default" : "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
              onDoubleClick={startEdit}
              title={list.title}
            >
              {list.title}
            </span>
          )}

          {/* Card count badge — hidden when compact */}
          {!compact && (
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "10px",
                fontWeight: 600,
                color: "#8a97b4",
                background: "rgba(255,255,255,0.07)",
                padding: "1px 8px",
                borderRadius: "99px",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {cards.length}
            </span>
          )}

          {!isUncategorized && !compact && (
            <button
              onClick={handleDelete}
              style={{
                lineHeight: 1,
                color: "#6b7a96",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "4px",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ff4d6a";
                e.currentTarget.style.background = "rgba(255,77,106,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#6b7a96";
                e.currentTarget.style.background = "none";
              }}
              title="Delete cohort"
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
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            style={{
              lineHeight: 1,
              color: "#6b7a96",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "4px",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#a0aec8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#6b7a96";
            }}
            title={collapsed ? "Expand" : "Collapse"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="16px"
              viewBox="0 -960 960 960"
              width="16px"
              fill="currentColor"
              style={{
                transform: collapsed ? "rotate(-90deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            >
              <path d="M480-360 280-560h400L480-360Z" />
            </svg>
          </button>
        </div>

        {/* Cards */}
        {!collapsed && (
          <Droppable droppableId={list.id} key={list.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  minHeight: "40px",
                  backgroundColor: snapshot.isDraggingOver
                    ? list.color + "0d"
                    : "transparent",
                  transition: "background-color 0.15s ease",
                  padding: snapshot.isDraggingOver ? "2px 0" : undefined,
                }}
              >
                {cards.length === 0 && !snapshot.isDraggingOver && (
                  <div
                    style={{
                      fontSize: "11px",
                      textAlign: "center",
                      padding: "20px 12px",
                      color: "#4e5a72",
                      fontStyle: "italic",
                    }}
                  >
                    No agents here
                  </div>
                )}
                {cards.map((card, index) => (
                  <AgentCard
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
        )}

        {/* Footer */}
        {!collapsed && (
          <div
            className="relative flex items-center px-4 py-2.5"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.015)",
              borderRadius: "0 0 14px 14px",
            }}
            ref={menuRef}
          >
            <button
              onClick={() => {
                setShowAddMenu((v) => !v);
                setShowArchived(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "monospace",
                fontSize: "11px",
                color: showAddMenu ? "#a0aec8" : "#7b8aa8",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#a0aec8";
              }}
              onMouseLeave={(e) => {
                if (!showAddMenu) e.currentTarget.style.color = "#7b8aa8";
              }}
            >
              <span
                style={{
                  fontSize: "16px",
                  lineHeight: 1,
                  color: showAddMenu ? "#a0aec8" : "#6b7a96",
                  fontWeight: 300,
                }}
              >
                +
              </span>
              <span>Add agent</span>
            </button>

            {showAddMenu && (
              <div
                className="absolute top-full left-0 mt-2 z-10"
                style={{
                  backgroundColor: "#1a2035",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  minWidth: "170px",
                  maxHeight: "160px",
                  overflowY: "auto",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {!showArchived ? (
                  <>
                    <button
                      className="w-full text-left transition-colors hover:bg-white/5"
                      style={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        color: "#9aa8c4",
                        padding: "9px 14px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "block",
                      }}
                      onClick={() => {
                        fetchArchivedSessions();
                        setShowArchived(true);
                      }}
                    >
                      Existing agent
                    </button>
                    <div
                      style={{
                        height: "1px",
                        background: "rgba(255,255,255,0.06)",
                        margin: "0 10px",
                      }}
                    />
                    <button
                      className="w-full text-left transition-colors hover:bg-white/5"
                      style={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        color: "#9aa8c4",
                        padding: "9px 14px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "block",
                      }}
                      onClick={() => {
                        newSession(list.id);
                        setShowAddMenu(false);
                      }}
                    >
                      New agent
                    </button>
                  </>
                ) : archivedSessions.length === 0 ? (
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: "#6b7a96",
                      padding: "10px 14px",
                    }}
                  >
                    No archived agents
                  </div>
                ) : (
                  archivedSessions.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left transition-colors hover:bg-white/5"
                      style={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        color: "#9aa8c4",
                        padding: "9px 14px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "block",
                        width: "100%",
                      }}
                      onClick={() => {
                        addExistingSession(s.id, list.id);
                        setShowAddMenu(false);
                        setShowArchived(false);
                      }}
                    >
                      {s.name}
                      <span style={{ color: "#6b7a96", marginLeft: "6px" }}>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {openCard && !compact && (
        <AgentCardModal
          card={openCard}
          list={list}
          onClose={() => setOpenCardId(null)}
        />
      )}

      {showDeletePopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => setShowDeletePopup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a2035",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "14px",
              padding: "24px",
              width: "280px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#dde1f0",
                }}
              >
                Delete cohort?
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  color: "#6b7a96",
                  lineHeight: 1.5,
                }}
              >
                {cards.length > 0
                  ? `"${list.title}" will be deleted. ${cards.length} agent(s) will move to Uncategorized.`
                  : `"${list.title}" will be permanently deleted.`}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowDeletePopup(false)}
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  padding: "6px 14px",
                  borderRadius: "7px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#9aa8c4",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteCohort(list.id);
                  setShowDeletePopup(false);
                }}
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "6px 14px",
                  borderRadius: "7px",
                  background: "rgba(255,77,106,0.15)",
                  border: "1px solid rgba(255,77,106,0.35)",
                  color: "#ff4d6a",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,77,106,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,77,106,0.15)";
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
