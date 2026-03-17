import { useState } from "react";
import type { DraggableProvidedDraggableProps, DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { useBoardContext } from "../context/useBoardContext";
import type { AgentInfo } from "../messageProtocol";
import { SubAgentCard } from "./SubAgentCard";

const SCOPE_CONFIG = {
  global: { label: "Global", color: "#34d399" },
  project: { label: "Project", color: "#7b9bff" },
} as const;

interface SubAgentListProps {
  scope: "global" | "project";
  agents: AgentInfo[];
  innerRef?: (element?: HTMLElement | null) => void;
  draggableProps?: DraggableProvidedDraggableProps;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export function SubAgentList({ scope, agents, innerRef, draggableProps, dragHandleProps }: SubAgentListProps) {
  const { openAddAgentPanel } = useBoardContext();
  const [collapsed, setCollapsed] = useState(false);
  const config = SCOPE_CONFIG[scope];

  return (
    <div
      ref={innerRef}
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
          borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
          borderRadius: collapsed ? "14px" : "14px 14px 0 0",
        }}
      >
        {/* Drag handle */}
        <div
          {...(dragHandleProps ?? {})}
          style={{ display: "flex", alignItems: "center", color: "#4e5a72", cursor: "grab", flexShrink: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
          </svg>
        </div>

        {/* Scope label */}
        <span
          className="flex-1 select-none font-mono text-[11px] font-bold tracking-[0.8px] uppercase"
          style={{ color: config.color }}
        >
          {config.label}
        </span>

        {/* Count badge */}
        <span
          className="font-mono text-[10px] font-semibold px-2 py-px rounded-full border"
          style={{
            color: "#8a97b4",
            background: "rgba(255,255,255,0.07)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          {agents.length}
        </span>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 border-none bg-transparent cursor-pointer p-1 rounded transition-colors duration-150"
          style={{ color: "#6b7a96", lineHeight: 1 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#a0aec8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7a96"; }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="16px"
            viewBox="0 -960 960 960"
            width="16px"
            fill="currentColor"
            style={{ transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.2s ease" }}
          >
            <path d="M480-360 280-560h400L480-360Z"/>
          </svg>
        </button>
      </div>

      {/* Cards */}
      {!collapsed && (
        <div style={{ minHeight: "8px" }}>
          {agents.length === 0 ? (
            <div
              className="text-center py-5 font-mono text-[11px] italic"
              style={{ color: "#4e5a72" }}
            >
              No {config.label.toLowerCase()} subagents
            </div>
          ) : (
            agents.map((agent) => (
              <SubAgentCard key={agent.name} agent={agent} />
            ))
          )}
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div
          className="flex items-center px-4 py-2.5"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.015)",
            borderRadius: "0 0 14px 14px",
          }}
        >
          <button
            onClick={() => openAddAgentPanel(scope)}
            className="flex items-center gap-1.5 font-mono text-[11px] bg-transparent border-none cursor-pointer p-0 transition-colors duration-150"
            style={{ color: "#7b8aa8" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#a0aec8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#7b8aa8"; }}
          >
            <span style={{ fontSize: "16px", lineHeight: 1, color: "inherit", fontWeight: 300 }}>+</span>
            <span>Add subagent</span>
          </button>
        </div>
      )}
    </div>
  );
}
