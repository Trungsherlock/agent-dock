import { useState, useEffect, useRef } from "react";
import { Draggable } from "@hello-pangea/dnd";
import type { BoardCard, BoardList } from "../context/BoardContext";
import { useBoardContext } from "../context/useBoardContext";

interface CardProps {
  card: BoardCard;
  list: BoardList;
  index: number;
  onClick: () => void;
}

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  running: { color: "#f59e0b", label: "running" },
  thinking: { color: "#818cf8", label: "thinking" },
  idle: { color: "#858585", label: "idle" },
  done: { color: "#89d185", label: "done" },
  error: { color: "#ef4444", label: "error" },
};

const TOOL_ICON: Record<string, string> = {
  running: "⟳",
  done: "✓",
  error: "✗",
};

const TOOL_ICON_COLOR: Record<string, string> = {
  running: "#f59e0b",
  done: "#4ec9b0",
  error: "#ef4444",
};

function formatDuration(createdAt: string): string {
  const s = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function extractPathFromInput(input: string): string {
  try {
    const p = JSON.parse(input);
    return p.file_path ?? p.notebook_path ?? p.command ?? input;
  } catch {
    return input;
  }
}

export function Card({ card, list, index, onClick }: CardProps) {
  const { focusSession, resumeSession } = useBoardContext();
  const [, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const runStartedAt = useRef<number>(0);

  const isActive = card.status === "running" || card.status === "thinking";

  useEffect(() => {
    if (!isActive) return;
    runStartedAt.current = Date.now();
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  const statusStyle = STATUS_STYLE[card.status] ?? STATUS_STYLE.idle;
  const totalTokens = card.tokensInput + card.tokensOutput;
  const contextPct =
    card.contextWindowMax > 0
      ? Math.min(
          100,
          Math.round((card.contextWindowUsed / card.contextWindowMax) * 100),
        )
      : 0;
  const contextBarColor =
    contextPct > 80 ? "#ef4444" : contextPct > 60 ? "#f59e0b" : "#4ec9b0";
  const recentTools = card.toolCalls.slice(-3);
  const hasTools = recentTools.length > 0 || card.filesTouched.length > 0;

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.85 : 1,
            marginBottom: "10px",
            borderRadius: "3px",
            border: "1px solid #333348",
            backgroundColor: "#252535",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            overflow: "hidden",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          {/* Thin color accent top bar */}
          <div style={{ height: "3px", backgroundColor: list.color }} />

          <div
            onClick={() => card.status === "done" ? resumeSession(card.id) : focusSession(card.id)}
            style={{
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    fontFamily: "monospace",
                    color: "#6b7a99",
                    marginBottom: "1px",
                  }}
                >
                  {card.id}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#e2e8f0",
                    lineHeight: 1.3,
                  }}
                >
                  {card.name}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                title="Open details"
                style={{
                  fontSize: "11px",
                  padding: "2px 7px",
                  borderRadius: "5px",
                  background: "#2e2e42",
                  color: "#8892a4",
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                ⌨
              </button>
            </div>

            {/* Status row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "11px",
                color: "#8892a4",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span style={{ color: statusStyle.color, fontSize: "9px" }}>
                  ●
                </span>
                {statusStyle.label}
              </span>
              <span>{isActive && runStartedAt.current > 0 ? formatDuration(new Date(runStartedAt.current).toISOString()) : formatDuration(card.createdAt)}</span>
              <span
                style={{
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "#2e2e42",
                  fontSize: "10px",
                }}
              >
                {card.framework}
              </span>
            </div>

            {/* Live tool */}
            {card.currentTool && (
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "monospace",
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  overflow: "hidden",
                }}
              >
                <span style={{ flexShrink: 0 }}>⟳</span>
                <span style={{ fontWeight: 600, flexShrink: 0 }}>{card.currentTool.name}</span>
                {card.currentTool.target && (
                  <>
                    <span style={{ color: "#6b7a99", flexShrink: 0 }}>→</span>
                    <span
                      style={{
                        color: "#8892a4",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {card.currentTool.target}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Context bar */}
            {contextPct > 0 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "3px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    color: "#6b7a99",
                  }}
                >
                  <span>Context {contextPct}%</span>
                  <span style={{ display: "flex", gap: "8px" }}>
                    {totalTokens > 0 && (
                      <span>{formatTokens(totalTokens)} tok</span>
                    )}
                    {card.costUsd > 0 && (
                      <span>${card.costUsd.toFixed(3)}</span>
                    )}
                  </span>
                </div>
                <div
                  style={{
                    height: "5px",
                    borderRadius: "99px",
                    background: "#2e2e42",
                  }}
                >
                  <div
                    style={{
                      height: "5px",
                      borderRadius: "99px",
                      width: `${contextPct}%`,
                      backgroundColor: contextBarColor,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Current task */}
            {card.currentTask && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#8892a4",
                  fontStyle: "italic",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {card.currentTask}
              </div>
            )}

            {/* Tool calls */}
            {expanded && recentTools.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#6b7a99",
                    marginBottom: "4px",
                  }}
                >
                  Tool Calls
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  {recentTools.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "10px",
                        fontFamily: "monospace",
                      }}
                    >
                      <span
                        style={{
                          color: TOOL_ICON_COLOR[t.status],
                          width: "10px",
                          flexShrink: 0,
                        }}
                      >
                        {TOOL_ICON[t.status]}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#c9d1e0",
                          width: "72px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {t.name}
                      </span>
                      <span
                        style={{
                          color: "#6b7a99",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {extractPathFromInput(t.input)}
                      </span>
                      {t.durationMs !== undefined && (
                        <span style={{ color: "#9ca3af", flexShrink: 0 }}>
                          {t.durationMs}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files touched */}
            {expanded && card.filesTouched.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#6b7a99",
                    marginBottom: "3px",
                  }}
                >
                  Files Touched
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#8892a4",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {card.filesTouched.slice(-5).join(" · ")}
                </div>
              </div>
            )}

            {/* Expand toggle */}
            {hasTools && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((prev) => !prev);
                }}
                style={{
                  fontSize: "9px",
                  color: "#6b7a99",
                  textAlign: "center",
                  marginTop: "-2px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                  padding: "2px 0",
                }}
              >
                {expanded ? "▲" : "▼"}
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
