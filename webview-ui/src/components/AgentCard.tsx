import { useState, useEffect, useRef } from "react";
import { Draggable } from "@hello-pangea/dnd";
import type { BoardCard, BoardList } from "../context/BoardContext";
import { useBoardContext } from "../context/useBoardContext";
import vscode from "../vscodeApi";

interface AgentCardProps {
  card: BoardCard;
  list: BoardList;
  index: number;
  onClick: () => void;
}

const STATUS_STYLE: Record<string, { color: string; glow: string; label: string; bg: string }> = {
  running:  { color: "#00d4aa", glow: "rgba(0,212,170,0.3)",   label: "Running",  bg: "rgba(0,212,170,0.08)" },
  thinking: { color: "#818cf8", glow: "rgba(129,140,248,0.3)", label: "Thinking", bg: "rgba(129,140,248,0.08)" },
  idle:     { color: "#f0a500", glow: "rgba(240,165,0,0.25)",  label: "Idle",     bg: "rgba(240,165,0,0.08)" },
  error:    { color: "#ff4d6a", glow: "rgba(255,77,106,0.3)",  label: "Error",    bg: "rgba(255,77,106,0.08)" },
};

const FRAMEWORK_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  claude: {
    bg: "rgba(232,121,58,0.12)",
    color: "#e8793a",
    border: "1px solid rgba(232,121,58,0.3)",
  },
  custom: {
    bg: "rgba(91,124,246,0.12)",
    color: "#5b7cf6",
    border: "1px solid rgba(91,124,246,0.3)",
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

export function AgentCard({ card, index, onClick }: AgentCardProps) {
  const { focusSession, resumeSession } = useBoardContext();
  const [, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [compact, setCompact] = useState(false);
  const runStartedAt = useRef<number>(0);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < 180);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
            opacity: snapshot.isDragging ? 0.9 : 1,
            padding: "4px 6px",
          }}
        >
          <div
            ref={innerRef}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: "relative",
              backgroundColor: snapshot.isDragging
                ? "#222a42"
                : hovered
                  ? "#1e2540"
                  : "#161b2e",
              border: `1px solid ${hovered || snapshot.isDragging ? statusStyle.color + "70" : statusStyle.color + "22"}`,
              borderRadius: "12px",
              cursor: "pointer",
              userSelect: "none",
              transition: "all 0.15s ease",
              overflow: "hidden",
              boxShadow: hovered
                ? `0 6px 24px rgba(0,0,0,0.45), 0 0 0 1px ${statusStyle.color}28`
                : snapshot.isDragging
                  ? `0 10px 32px rgba(0,0,0,0.5)`
                  : "0 1px 4px rgba(0,0,0,0.2)",
            }}
          >
            {/* Top accent gradient line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "3px",
                background: statusStyle.color,
                opacity: isActive ? 1 : 0.5,
              }}
            />

            <div
              onClick={() => focusSession(card.id)}
              style={{
                padding: compact ? "10px 10px 10px 16px" : "14px 14px 12px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* Top row: badge + name + (compact: status | full: open button) */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {!compact && (
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "9px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "5px",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      background: frameworkBadge.bg,
                      color: frameworkBadge.color,
                      border: frameworkBadge.border,
                      flexShrink: 0,
                    }}
                  >
                    {card.framework}
                  </span>
                )}
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#dde1f0",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.1px",
                  }}
                >
                  {card.name}
                </span>

                {compact ? (
                  /* Compact: inline status badge */
                  <span
                    style={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 6px 2px 5px",
                      borderRadius: "99px",
                      background: card.hasTerminal ? statusStyle.bg : "rgba(107,122,150,0.08)",
                      border: `1px solid ${card.hasTerminal ? statusStyle.color : "#6b7a96"}30`,
                    }}
                  >
                    <span
                      className={isActive ? `${dotClass} status-dot-active` : dotClass}
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        backgroundColor: card.hasTerminal ? statusStyle.color : "#6b7a96",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: card.hasTerminal ? statusStyle.color : "#6b7a96", fontSize: "9px", fontWeight: 600 }}>
                      {card.hasTerminal ? statusStyle.label : "offline"}
                    </span>
                  </span>
                ) : (
                  /* Full: open button */
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                    title="Open terminal"
                    style={{
                      fontSize: "12px",
                      width: "26px",
                      height: "26px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      color: "#8891a8",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                      e.currentTarget.style.color = "#c0c8e0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "#8891a8";
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF">
                      <path d="M480-120 156-300v-360l324-180 324 180v360L480-120ZM376-579q20-21 47.5-33t56.5-12q29 0 56.5 12t47.5 33l109-60-213-118-213 118 109 60Zm68 357v-118q-48-12-78-51t-30-89q0-9 .5-18.5T341-516l-113-63v237l216 120Zm87-207q21-21 21-51t-21-51q-21-21-51-21t-51 21q-21 21-21 51t21 51q21 21 51 21t51-21Zm-15 207 216-120v-237l-113 63q3 8 4 17.5t1 18.5q0 50-30 89t-78 51v118Z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Status row — hidden in compact mode */}
              {!compact && <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  alignSelf: "flex-start",
                  padding: "3px 8px 3px 6px",
                  borderRadius: "99px",
                  background: card.hasTerminal ? statusStyle.bg : "rgba(107,122,150,0.08)",
                  border: `1px solid ${card.hasTerminal ? statusStyle.color : "#6b7a96"}30`,
                }}
              >
                {card.hasTerminal ? (
                  <>
                    <span
                      className={isActive ? `${dotClass} status-dot-active` : dotClass}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: statusStyle.color,
                        boxShadow: `0 0 5px ${statusStyle.glow}`,
                        flexShrink: 0,
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: statusStyle.color, fontSize: "10px", fontWeight: 600 }}>
                      {statusStyle.label}
                    </span>
                    {isActive && (
                      <span style={{ color: "#6b7a96", fontSize: "10px" }}>
                        {runStartedAt.current > 0
                          ? formatDuration(new Date(runStartedAt.current).toISOString())
                          : formatDuration(card.createdAt)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span style={{ color: "#6b7a96", fontSize: "10px", fontWeight: 600 }}>
                      offline
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); resumeSession(card.id); }}
                      style={{
                        background: "rgba(129,140,248,0.12)",
                        border: "1px solid rgba(129,140,248,0.3)",
                        borderRadius: "99px",
                        color: "#818cf8",
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "1px 7px",
                        cursor: "pointer",
                      }}
                    >
                      Resume
                    </button>
                  </>
                )}
              </div>}

              {/* Live tool action — hidden in compact mode */}
              {!compact && card.currentTool && (
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    color: "#00d4aa",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    background: "rgba(0,212,170,0.06)",
                    border: "1px solid rgba(0,212,170,0.15)",
                  }}
                >
                  <span className="spin-icon" style={{ flexShrink: 0 }}>
                    ↻
                  </span>
                  <span style={{ fontWeight: 600, flexShrink: 0 }}>
                    {card.currentTool.name}
                  </span>
                  {card.currentTool.target && (
                    <span
                      style={{
                        color: "#6b7a96",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {card.currentTool.target.split(/[\\/]/).pop()}
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
                        padding: "3px 8px",
                        borderRadius: "99px",
                        background: "rgba(250,204,21,0.12)",
                        color: "#facc15",
                        border: "1px solid rgba(250,204,21,0.3)",
                        cursor: "pointer",
                        letterSpacing: "0.3px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      needs approval
                    </button>
                  )}
                </div>
              )}

              {/* Context bar — hidden in compact mode */}
              {!compact && contextPct > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <div
                    style={{
                      height: "4px",
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
                          card.status === "running" ||
                          card.status === "thinking"
                            ? "0 0 8px rgba(0,212,170,0.4)"
                            : undefined,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "9px",
                      color: "#6b7a96",
                    }}
                  >
                    <span>Context {contextPct}%</span>
                    <span>
                      {totalTokens > 0 && `${formatTokens(totalTokens)} tok`}
                      {/* {totalTokens > 0 && card.costUsd > 0 && " · "}
                      {card.costUsd > 0 && `$${card.costUsd.toFixed(3)}`} */}
                    </span>
                  </div>
                </div>
              )}

              {/* Skill tags */}
              {/* {card.skills && card.skills.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {card.skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        fontFamily: "monospace",
                        fontSize: "9px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "99px",
                        background: "rgba(91,124,246,0.1)",
                        color: "#7b96f5",
                        border: "1px solid rgba(91,124,246,0.22)",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )} */}

              {/* Tool calls (expanded) */}
              {!compact && expanded && recentTools.length > 0 && (
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#6b7a96",
                      marginBottom: "6px",
                    }}
                  >
                    Tool Calls
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {recentTools.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
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
                            paddingTop: "1px",
                          }}
                        >
                          {TOOL_ICON[t.status]}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "#c8cedf",
                            }}
                          >
                            {t.name}
                          </span>
                          {extractPathFromInput(t.input) && (
                            <span
                              style={{
                                color: "#6b7a96",
                                wordBreak: "break-all",
                                display: "block",
                              }}
                            >
                              {extractPathFromInput(t.input)}
                            </span>
                          )}
                        </div>
                        {t.durationMs !== undefined && (
                          <span style={{ color: "#6b7a96", flexShrink: 0, paddingTop: "1px" }}>
                            {t.durationMs}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files touched (expanded) */}
              {!compact && expanded && card.filesTouched.length > 0 && (
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#6b7a96",
                      marginBottom: "4px",
                    }}
                  >
                    Files Touched
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    {card.filesTouched.slice(-5).map((f, i) => (
                      <span
                        key={i}
                        onClick={(e) => { e.stopPropagation(); vscode.postMessage({ command: "openFile", filePath: f }); }}
                        style={{
                          fontSize: "10px",
                          color: "#6b7a96",
                          fontFamily: "monospace",
                          wordBreak: "break-all",
                          cursor: "pointer",
                          textDecoration: "underline",
                          textDecorationColor: "rgba(107,122,150,0.4)",
                          textUnderlineOffset: "2px",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#a0aec8"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7a96"; }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Expand toggle — hidden in compact mode */}
              {!compact && hasTools && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((prev) => !prev);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    fontSize: "9px",
                    color: "#6b7a96",
                    marginTop: "-2px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    width: "100%",
                    padding: "4px 0",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "#8891a8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "#6b7a96";
                  }}
                >
                  {expanded ? 
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M480-525 291-336l-51-51 240-240 240 240-51 51-189-189Z"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M480-333 240-573l51-51 189 189 189-189 51 51-240 240Z"/></svg>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
