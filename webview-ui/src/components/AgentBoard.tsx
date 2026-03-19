import { useState } from "react";
import { AgentTab } from "./AgentTab";
import { SubAgentTab } from "./SubAgentTab";

type Tab = "agents" | "subagents";

export function AgentBoard() {
  const [activeTab, setActiveTab] = useState<Tab>("agents");

  const tabs: { id: Tab; label: string }[] = [
    { id: "agents", label: "Agents" },
    { id: "subagents", label: "Subagents" },
  ];

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d1117" }}
    >
      {/* Tab bar */}
      <div style={{ padding: "8px 12px 0", flexShrink: 0 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            padding: "3px",
            borderRadius: "8px",
            background: "#12161f",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontFamily: "monospace",
                  fontSize: "10px",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.5px",
                  color: isActive ? "#c8cedf" : "#5a6a88",
                  background: isActive ? "rgba(255,255,255,0.07)" : "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 12px",
                  borderRadius: "5px",
                  transition: "color 0.18s ease, background 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#8a97b4";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#5a6a88";
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <AgentTab visible={activeTab === "agents"} />
        <SubAgentTab visible={activeTab === "subagents"} />
      </div>
    </div>
  );
}
