import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useBoardContext } from "../context/useBoardContext";
import { List } from "./List";

export function AgentTab({ visible }: { visible: boolean }) {
  const { state, moveCard, moveList, createCohort } = useBoardContext();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;
    if (type === "LIST") {
      moveList(source.index, destination.index);
      return;
    }
    moveCard(draggableId, source.droppableId, destination.droppableId, destination.index);
  };

  const submitNew = () => {
    const label = newLabel.trim();
    if (label) createCohort(label);
    setNewLabel("");
    setAdding(false);
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflowY: "auto",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <StatusBar />
      <DragDropContext onDragEnd={onDragEnd}>
        {state.listOrder.length === 0 && !adding ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "120px",
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#4e5a72",
              fontStyle: "italic",
            }}
          >
            No cohorts yet.
          </div>
        ) : (
          <Droppable droppableId="board" type="LIST">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
              >
                {state.listOrder.map((listId, index) => {
                  const list = state.lists[listId];
                  if (!list) return null;
                  return (
                    <Draggable key={listId} draggableId={`list-${listId}`} index={index}>
                      {(provided) => (
                        <List
                          list={list}
                          innerRef={provided.innerRef}
                          draggableProps={provided.draggableProps}
                          dragHandleProps={provided.dragHandleProps}
                        />
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </DragDropContext>

      {adding ? (
        <div style={{ padding: "0 2px" }}>
          <input
            autoFocus
            placeholder="Cohort name..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNew();
              if (e.key === "Escape") { setAdding(false); setNewLabel(""); }
            }}
            onBlur={submitNew}
            style={{
              width: "100%",
              background: "#161b2e",
              border: "1px solid rgba(129,140,248,0.4)",
              borderRadius: "8px",
              padding: "7px 12px",
              color: "#dde1f0",
              fontFamily: "monospace",
              fontSize: "11px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#6b7a96",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 2px",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#a0aec8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7a96"; }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1, fontWeight: 300 }}>+</span>
          <span>Add cohort</span>
        </button>
      )}
    </div>
  );
}

function StatusBar() {
  const { state } = useBoardContext();
  const cards = Object.values(state.cards);

  if (cards.length === 0) return null;

  const active = cards.filter((c) => c.status === "running" || c.status === "thinking").length;
  const tokens = cards.reduce((sum, c) => sum + c.tokensInput + c.tokensOutput, 0);
  const cost = cards.reduce((sum, c) => sum + c.costUsd, 0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "7px 14px",
        borderRadius: "10px",
        background: "#12161f",
        border: "1px solid rgba(255,255,255,0.07)",
        marginBottom: "4px",
        flexWrap: "wrap",
      }}
    >
      {active > 0 && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "monospace",
            fontSize: "10px",
            fontWeight: 600,
            color: "#00d4aa",
          }}
        >
          <span
            className="status-dot-active"
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#00d4aa",
              boxShadow: "0 0 5px rgba(0,212,170,0.6)",
            }}
          />
          {active} active
        </span>
      )}
      {tokens > 0 && (
        <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#6b7a96" }}>
          {formatTokens(tokens)}
        </span>
      )}
      {cost > 0 && (
        <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#6b7a96" }}>
          ${cost.toFixed(3)}
        </span>
      )}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M tok`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k tok`;
  return `${n} tok`;
}
