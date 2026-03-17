import { useState, useRef, useEffect } from "react";
import vscode from '../vscodeApi';
import type { AgentInfo } from '../messageProtocol';

const FRAMEWORK_BADGE = {
  bg: "rgba(232,121,58,0.15)",
  color: "#f09255",
  border: "1px solid rgba(232,121,58,0.35)",
};

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: "11px",
        fontFamily: "monospace",
        padding: "3px 9px",
        borderRadius: "6px",
        background: color + "1a",
        color: color,
        border: `1px solid ${color}50`,
        whiteSpace: "nowrap",
        letterSpacing: "0.2px",
      }}
    >
      {label}
    </span>
  );
}

export function SubAgentCard({ agent }: { agent: AgentInfo }) {
  const [expanded, setExpanded] = useState(false);
  const [compact, setCompact] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasExtension = !!(agent.model || agent.tools.length || agent.skills.length);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < 180);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ padding: "4px 6px" }}>
      <div
        ref={cardRef}
        onClick={() => !compact && hasExtension && setExpanded((v) => !v)}
        style={{
          position: "relative",
          backgroundColor: "#13182a",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          overflow: "hidden",
          transition: "border-color 0.15s ease, background-color 0.15s ease",
          cursor: hasExtension ? "pointer" : "default",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.16)";
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "#1a2038";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "#13182a";
        }}
      >
        {/* Main content */}
        <div style={{ padding: compact ? "10px 12px" : "14px 16px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Framework badge — hidden when compact */}
            {!compact && (
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: "6px",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  background: FRAMEWORK_BADGE.bg,
                  color: FRAMEWORK_BADGE.color,
                  border: FRAMEWORK_BADGE.border,
                  flexShrink: 0,
                }}
              >
                claude
              </span>
            )}

            {/* Name */}
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#eef0f8",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
                letterSpacing: "-0.1px",
              }}
            >
              {agent.name}
            </span>

            {/* Open button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                vscode.postMessage({ command: "openFile", filePath: agent.filePath });
              }}
              style={{
                flexShrink: 0,
                fontFamily: "monospace",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#f0a500",
                background: "rgba(240,165,0,0.12)",
                border: "1px solid rgba(240,165,0,0.35)",
                borderRadius: "6px",
                padding: "3px 10px",
                cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(240,165,0,0.22)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(240,165,0,0.6)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(240,165,0,0.12)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(240,165,0,0.35)";
              }}
            >
              Open
            </button>
          </div>

          {/* Description — hidden when compact */}
          {!compact && agent.description && (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "12px",
                color: "#8a97b5",
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {agent.description}
            </p>
          )}
        </div>

        {/* Extension panel — hidden when compact */}
        {!compact && hasExtension && expanded && (
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              padding: "12px 16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "rgba(0,0,0,0.15)",
            }}
          >
            {/* Model */}
            {agent.model && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#4e5e7a",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    minWidth: "44px",
                  }}
                >
                  Model
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "#c0c8df",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    padding: "3px 10px",
                  }}
                >
                  {agent.model}
                </span>
              </div>
            )}

            {/* Tools */}
            {agent.tools.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#4e5e7a",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Tools
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {agent.tools.map((tool) => (
                    <Pill key={tool} label={tool} color="#7b9bff" />
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {agent.skills.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#4e5e7a",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Skills
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {agent.skills.map((skill) => (
                    <Pill key={skill} label={skill} color="#a78bfa" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
