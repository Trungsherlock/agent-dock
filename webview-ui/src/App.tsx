import { useEffect, useState, useRef } from "react";
import vscode from "./vscodeApi";
import type { SerializedSession, SerializedCategory, ExtensionMessage } from './messageProtocol';

interface BoardState {
  sessions: SerializedSession[];
  categories: SerializedCategory[];
}

interface ContextMenu {
  x: number;
  y: number;
  session: SerializedSession;
}

export default function App() {
  const [state, setState] = useState<BoardState>({ sessions: [], categories: [] });
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; value: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  useEffect(() => {
    vscode.postMessage({ command: 'ready' });

    const handler = (event: MessageEvent) => {
      const msg = event.data as ExtensionMessage;
      if (msg.command === 'stateUpdate') {
        setState({ sessions: msg.sessions, categories: msg.categories });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
  }, [contextMenu]);

  const grouped = state.categories.map(cat => ({
    category: cat,
    sessions: state.sessions.filter(s =>  s.categoryId === cat.id),
  }));

  function handleRightClick(e: React.MouseEvent, session: SerializedSession) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, session });
  }

  function startRename(session: SerializedSession) {
    setRenamingId(session.id);
    setRenameValue(session.name);
    setContextMenu(null);
  }

  function commitRename(sessionId: string) {
    if (renameValue.trim()) {
      vscode.postMessage({ command: 'renameSession', sessionId, newName: renameValue.trim() });
    }
    setRenamingId(null);
  }

  function startEditNote(session: SerializedSession) {
    setEditingNote({ id: session.id, value: session.note });
    setContextMenu(null);
  }

  function commitNote(sessionId: string) {
    if (editingNote) {
      vscode.postMessage({ command: 'setNote', sessionId, note: editingNote.value });
    }
    setEditingNote(null);
  }

  function handleDrop(categoryId: string) {
    if (draggedId) {
      const session = state.sessions.find(s => s.id === draggedId);
      if (session && session.categoryId !== categoryId) {
        vscode.postMessage({ command: 'moveSession', sessionId: draggedId, newCategoryId: categoryId });
      }
    }
    setDraggedId(null);
    setDragOverCategoryId(null);
  }

  const visibleGroups = grouped.filter(g => g.sessions.length > 0 || draggedId !== null);

  return (
    <div style={{
        padding: "12px",
        color: "var(--vscode-foreground)",
        fontFamily: "var(--vscode-font-family)",
      }}
      onClick={() => setContextMenu(null)}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13 }}>Agent Board</span>
        <button
          onClick={() => vscode.postMessage({ command: "newSession" })}
          style={{
            background: "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            padding: "4px 10px",
            borderRadius: 3,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          + New Agent
        </button>
      </div>

      {state.sessions.length === 0 && (
        <div
          style={{
            color: "var(--vscode-descriptionForeground)",
            fontSize: 12,
            textAlign: "center",
            marginTop: 40,
          }}
        >
          No active agents. Click + New Agent to start.
        </div>
      )}

      {visibleGroups
        .map(({ category, sessions }) => {
          const isDropTarget = dragOverCategoryId === category.id;
          const draggedSession = draggedId ? state.sessions.find(s => s.id === draggedId) : null;
          const canDrop = draggedSession && draggedSession.categoryId !== category.id;

          return (
            <div
              key={category.id}
              style={{ marginBottom: 16 }}
              onDragOver={(e) => {
                if (!draggedId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverCategoryId(category.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCategoryId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(category.id);
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: category.color,
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
                <span
                  style={{
                    color: "var(--vscode-descriptionForeground)",
                    fontWeight: 400,
                  }}
                >
                  ({sessions.length})
                </span>
              </div>

              {sessions.map((session) => {
                const isDragging = draggedId === session.id;

                return (
                  <div
                    key={session.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggedId(session.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", session.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverCategoryId(null);
                    }}
                    onClick={() => {
                      if (!draggedId) {
                        vscode.postMessage({
                          command: "focusSession",
                          sessionId: session.id,
                        });
                      }
                    }}
                    onContextMenu={(e) => handleRightClick(e, session)}
                    style={{
                      background: "var(--vscode-list-hoverBackground)",
                      border: "1px solid var(--vscode-widget-border)",
                      borderRadius: 4,
                      padding: "8px 10px",
                      marginBottom: 6,
                      cursor: isDragging ? "grabbing" : "grab",
                      fontSize: 12,
                      opacity: isDragging ? 0.4 : 1,
                      transition: "opacity 0.15s",
                      userSelect: "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      {renamingId === session.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(session.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(session.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: "var(--vscode-input-background)",
                            color: "var(--vscode-input-background)",
                            border: "1px solid var(--vscode-focusBorder)",
                            borderRadius: 3,
                            padding: "2px 6px",
                            fontSize: 12,
                            fontWeight: 500,
                            width: "100%",
                            marginRight: 8,
                            outline: "none",
                          }}
                        />
                      ) : (
                        <div style={{ fontWeight: 500 }}>{session.name}</div>
                      )}
                      <StatusBadge
                        status={session.status}
                        onClick={(e) => {
                          e.stopPropagation();
                          const cycle: Record<string, string> = { active: 'idle', idle: 'done', done: 'active' };
                          vscode.postMessage({ command: 'setStatus', sessionId: session.id, status: cycle[session.status] ?? 'active' });
                        }}
                      />
                    </div>

                    {editingNote?.id === session.id ? (
                      <input
                        autoFocus
                        value={editingNote.value}
                        onChange={(e) =>
                          setEditingNote({
                            id: session.id,
                            value: e.target.value,
                          })
                        }
                        onBlur={() => commitNote(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitNote(session.id);
                          if (e.key === "Escape") setEditingNote(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Add a note..."
                        style={{
                          marginTop: 4,
                          background: "var(--vscode-input-background)",
                          color: "var(--vscode-input-foreground)",
                          border: "1px solid var(--vscode-focusBorder)",
                          borderRadius: 3,
                          padding: "2px 6px",
                          fontSize: 11,
                          width: "100%",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    ) : session.note ? (
                      <div
                        style={{
                          color: "var(--vscode-descriptionForeground)",
                          marginTop: 2,
                          fontSize: 11,
                        }}
                      >
                        {session.note}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {isDropTarget && canDrop && (
                <div
                  style={{
                    border: `2px dashed ${category.color}`,
                    borderRadius: 4,
                    padding: "8px",
                    marginBottom: 6,
                    fontSize: 11,
                    color: category.color,
                    textAlign: "center",
                    opacity: 0.8,
                  }}
                >
                  Drop to move here
                </div>
              )}

              {sessions.length === 0 && draggedId && (
                <div
                  style={{
                    border: `2px dashed ${isDropTarget && canDrop ? category.color : "var(--vscode-widget-border)"}`,
                    borderRadius: 4,
                    padding: "12px",
                    fontSize: 11,
                    color:
                      isDropTarget && canDrop
                        ? category.color
                        : "var(--vscode-descriptionForeground)",
                    textAlign: "center",
                    opacity: 0.6,
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                >
                  Drop here
                </div>
              )}
            </div>
          );
        })}

        {contextMenu && (
          <ContextMenuPopup
            x={contextMenu.x}
            y={contextMenu.y}
            session={contextMenu.session}
            categories={state.categories}
            onRename={() => startRename(contextMenu.session)}
            onEditNote={() => startEditNote(contextMenu.session)}
            onEnd={() => {
              vscode.postMessage({ command: 'endSession', sessionId: contextMenu.session.id });
              setContextMenu(null);
            }}
            onMove={(newCategoryId: string) => {
              vscode.postMessage({ command: 'moveSession', sessionId: contextMenu.session.id, newCategoryId});
              setContextMenu(null);
            }}
            onClose={() => setContextMenu(null)}
          />
        )}
    </div>
  );
}

function ContextMenuPopup({
  x,
  y,
  session,
  categories,
  onRename,
  onEditNote,
  onEnd,
  onMove,
}: {
  x: number;
  y: number;
  session: SerializedSession;
  categories: SerializedCategory[];
  onRename: () => void;
  onEditNote: () => void;
  onEnd: () => void;
  onMove: (categoryId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const style: React.CSSProperties = {
    position: "fixed",
    top: y,
    left: x,
    background: "var(--vscode-menu-background)",
    border: "1px solid var(--vscode-menu-border)",
    borderRadius: 4,
    padding: "4px 0",
    zIndex: 1000,
    minWidth: 160,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    fontSize: 12,
  };

  const itemStyle: React.CSSProperties = {
    padding: "5px 14px",
    cursor: "pointer",
    color: "var(--vscode-menu-foreground)",
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: "none",
    fontSize: 12,
  };

  const dividerStyle: React.CSSProperties = {
    height: 1,
    background: "var(--vscode-menu-separatorBackground)",
    margin: "4px 0",
  };

  const otherCategories = categories.filter((c) => c.id !== session.categoryId);

  return (
    <div ref={ref} style={style} onClick={(e) => e.stopPropagation()}>
      <button
        style={itemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background =
            "var(--vscode-menu-selectionBackground)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        onClick={onRename}
      >
        Rename
      </button>
      <button
        style={itemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background =
            "var(--vscode-menu-selectionBackground)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        onClick={onEditNote}
      >
        {session.note ? "Edit note" : "Add note"}
      </button>

      {otherCategories.length > 0 && (
        <>
          <div style={dividerStyle} />
          <div
            style={{
              padding: "3px 14px 2px",
              fontSize: 10,
              color: "var(--vscode-descriptionForeground)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Move to
          </div>
          {otherCategories.map((cat) => (
            <button
              key={cat.id}
              style={itemStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "var(--vscode-menu-selectionBackground)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              onClick={() => onMove(cat.id)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </>
      )}

      <div style={dividerStyle} />
      <button
        style={{ ...itemStyle, color: "var(--vscode-errorForeground)" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background =
            "var(--vscode-menu-selectionBackground)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        onClick={onEnd}
      >
        End session
      </button>
    </div>
  );
}

function StatusBadge({ status, onClick }: { status: string; onClick?: (e: React.MouseEvent) => void }) {
  const map: Record<string, { label: string; color: string }> = {
    active: { label: 'active', color: '#4ec9b0' },
    idle:   { label: 'idle',   color: '#858585' },
    done:   { label: 'done',   color: '#89d185' },
  };
  const { label, color } = map[status] ?? map.idle;
  return (
    <span
      onClick={onClick}
      title="Click to cycle status"
      style={{ fontSize: 10, color, whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default' }}
    >
      {label}
    </span>
  );
}