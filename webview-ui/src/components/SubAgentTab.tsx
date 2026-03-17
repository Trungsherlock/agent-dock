import { useBoardContext } from "../context/useBoardContext";
import { SubAgentCard } from "./SubAgentCard";

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#7b8aa8",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        transition: "color 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#a0aec8"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "#7b8aa8"; }}
    >
      <span style={{ fontSize: "16px", lineHeight: 1, color: "#6b7a96", fontWeight: 300 }}>+</span>
      <span>Add Subagent</span>
    </button>
  );
}

export function SubAgentTab({ visible }: { visible: boolean }) {
  const { openAddAgentPanel, subAgents } = useBoardContext();
  const subagents = subAgents;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {subagents.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "10px",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                color: "#4e5a72",
                fontStyle: "italic",
              }}
            >
              No subagents yet.
            </span>
            <AddButton onClick={() => openAddAgentPanel("uncategorized")} />
          </div>
        ) : (
          <>
            {subagents.map((agent) => <SubAgentCard key={agent.name} agent={agent} />)}
            <div style={{ padding: "4px 6px 2px" }}>
              <AddButton onClick={() => openAddAgentPanel("uncategorized")} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
