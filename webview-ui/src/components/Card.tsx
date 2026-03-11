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

const STATUS_STYLE: Record<string, { color: string; glow: string; label: string }> = {
  running:  { color: "#00d4aa", glow: "rgba(0,212,170,0.35)",   label: "running" },
  thinking: { color: "#818cf8", glow: "rgba(129,140,248,0.35)", label: "thinking" },
  idle:     { color: "#f0a500", glow: "rgba(240,165,0,0.3)",    label: "idle" },
  error:    { color: "#ff4d6a", glow: "rgba(255,77,106,0.35)",  label: "error" },
};

const FRAMEWORK_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  claude: {
    bg: "rgba(232,121,58,0.15)",
    color: "#e8793a",
    border: "1px solid rgba(232,121,58,0.25)",
  },
  custom: {
    bg: "rgba(91,124,246,0.15)",
    color: "#5b7cf6",
    border: "1px solid rgba(91,124,246,0.25)",
  },
};

const TOOL_ICON: Record<string, string> = {
  running: "⟳",
  done: "✓",
  error: "✗",
};

const TOOL_ICON_COLOR: Record<string, string> = {
  running: "#00d4aa",
  done: "#4ade80",
  error: "#ff4d6a",
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

export function Card({ card, index, onClick }: CardProps) {
  const { focusSession } = useBoardContext();
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
  const frameworkBadge = FRAMEWORK_BADGE[card.framework] ?? FRAMEWORK_BADGE.custom;
  const totalTokens = card.tokensInput + card.tokensOutput;
  const contextPct =
    card.contextWindowMax > 0
      ? Math.min(100, Math.round((card.contextWindowUsed / card.contextWindowMax) * 100))
      : 0;

  const barBackground =
    card.status === "error"
      ? "linear-gradient(90deg, #c0392b, #ff4d6a)"
      : card.status === "running" || card.status === "thinking"
      ? "linear-gradient(90deg, #00b894, #00d4aa, #4dffd4)"
      : statusStyle.color;

  const recentTools = card.toolCalls.slice(-3);
  const hasTools = recentTools.length > 0 || card.filesTouched.length > 0;

  const dotClass =
    card.status === "running" || card.status === "thinking"
      ? "status-dot-pulse-green"
      : card.status === "error"
      ? "status-dot-pulse-red"
      : "";

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
            padding: "4px 6px",
          }}
        >
          {/* Inner wrapper handles positioning and background — never touched by DnD */}
          <div
            style={{
              position: "relative",
              backgroundColor: snapshot.isDragging ? "#212638" : "#1c2030",
              border: `1px solid ${statusStyle.color}28`,
              borderRadius: "6px",
              cursor: "pointer",
              userSelect: "none",
              transition: "background 0.15s ease",
              overflow: "hidden",
            }}
          >
          {/* Left accent stripe */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "3px",
              backgroundColor: statusStyle.color,
              boxShadow: `2px 0 8px ${statusStyle.glow}`,
            }}
          />

          <div
            onClick={() =>
              focusSession(card.id)
            }
            style={{
              padding: "11px 14px 11px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "7px",
            }}
          >
            {/* Top row: badge + name + button */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "4px",
                  letterSpacing: "0.3px",
                  background: frameworkBadge.bg,
                  color: frameworkBadge.color,
                  border: frameworkBadge.border,
                  flexShrink: 0,
                }}
              >
                {card.framework}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#e8eaf0",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {card.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                title="Open details"
                style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "#252c3d",
                  color: "#8891a8",
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
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
                gap: "6px",
                fontFamily: "monospace",
                fontSize: "10px",
              }}
            >
              <span
                className={dotClass}
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: statusStyle.color,
                  boxShadow: `0 0 6px ${statusStyle.glow}`,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              <span style={{ color: statusStyle.color }}>{statusStyle.label}</span>
              <span style={{ color: "#4e566a" }}>
                {isActive && runStartedAt.current > 0
                  ? formatDuration(new Date(runStartedAt.current).toISOString())
                  : formatDuration(card.createdAt)}
              </span>
            </div>

            {/* Live tool action */}
            {card.currentTool && (
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "10px",
                  color: "#00d4aa",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span className="spin-icon" style={{ flexShrink: 0 }}>↻</span>
                <span style={{ fontWeight: 600, flexShrink: 0 }}>
                  {card.currentTool.name}
                </span>
                {card.currentTool.target && (
                  <span style={{ color: "#8891a8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.currentTool.target.split("/").pop()}
                  </span>
                )}
                {card.waitingForPermission && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      focusSession(card.id);
                    }}
                    title="Claude is waiting for your approval"
                    style={{
                      marginLeft: "auto",
                      flexShrink: 0,
                      fontSize: "9px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(250,204,21,0.15)",
                      color: "#facc15",
                      border: "1px solid rgba(250,204,21,0.35)",
                      cursor: "pointer",
                      letterSpacing: "0.3px",
                    }}
                  >
                    ask for permission
                  </button>
                )}
              </div>
            )}

            {/* Context bar */}
            {contextPct > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div
                  style={{
                    height: "3px",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "99px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "99px",
                      width: `${contextPct}%`,
                      background: barBackground,
                      boxShadow:
                        card.status === "running" || card.status === "thinking"
                          ? "0 0 8px rgba(0,212,170,0.5)"
                          : undefined,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "monospace",
                    fontSize: "9px",
                    color: "#4e566a",
                  }}
                >
                  <span>Context {contextPct}%</span>
                  <span>
                    {totalTokens > 0 && `${formatTokens(totalTokens)} tok`}
                    {totalTokens > 0 && card.costUsd > 0 && " · "}
                    {card.costUsd > 0 && `$${card.costUsd.toFixed(3)}`}
                  </span>
                </div>
              </div>
            )}

            {/* Current task */}
            {card.currentTask && (
              <div
                style={{
                  fontSize: "10px",
                  color: "#8891a8",
                  fontStyle: "italic",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {card.currentTask}
              </div>
            )}

            {/* Tool calls (expanded) */}
            {expanded && recentTools.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#4e566a",
                    marginBottom: "4px",
                  }}
                >
                  Tool Calls
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
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
                          color: "#e8eaf0",
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
                          color: "#4e566a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {extractPathFromInput(t.input)}
                      </span>
                      {t.durationMs !== undefined && (
                        <span style={{ color: "#4e566a", flexShrink: 0 }}>
                          {t.durationMs}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files touched (expanded) */}
            {expanded && card.filesTouched.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#4e566a",
                    marginBottom: "3px",
                  }}
                >
                  Files Touched
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#8891a8",
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
                  color: "#4e566a",
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
          </div>{/* end inner wrapper */}
        </div>
      )}
    </Draggable>
  );
}
