import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useBoardContext } from "../context/useBoardContext";
import { List } from "./List";

export function Board() {
  const { state, moveCard, createCohort } = useBoardContext();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;
    moveCard(
      draggableId,
      source.droppableId,
      destination.droppableId,
      destination.index,
    );
  };

  const submitNew = () => {
    const label = newLabel.trim();
    if (label) {
      createCohort(label);
    }
    setNewLabel("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
      <StatusBar />
      <DragDropContext onDragEnd={onDragEnd}>
        {state.listOrder.length === 0 && !adding ? (
          <div
            className="flex items-center justify-center h-32 text-xs"
            style={{ color: "var(--vscode-descriptionForeground)" }}
          >
            No cohorts yet.
          </div>
        ) : (
          state.listOrder.map((listId) => {
            const list = state.lists[listId];
            if (!list) return null;
            return <List key={listId} list={list} />;
          })
        )}
      </DragDropContext>

      {adding ? (
        <div className="flex gap-2 px-1">
          <input
            autoFocus
            className="flex-1 rounded px-2 py-1 text-sm border"
            style={{
              background: "var(--vscode-input-background)",
              color: "var(--vscode-input-foreground)",
              borderColor: "var(--vscode-input-border)",
            }}
            placeholder="Cohort name..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNew();
              if (e.key === "Escape") {
                setAdding(false);
                setNewLabel("");
              }
            }}
            onBlur={submitNew}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-opacity hover:opacity-70"
          style={{ color: "var(--vscode-descriptionForeground)" }}
        >
          <span className="text-base leading-none">+</span>
          <span>Add cohort</span>
        </button>
      )}
    </div>
  );
}

function StatusBar() {
  const { state } = useBoardContext();
  const cards = Object.values(state.cards);

  if (cards.length === 0) {
    return null;
  }

  const active = cards.filter((c) => c.status === "active").length;
  const done = cards.filter((c) => c.status === "done").length;
  const tokens = cards.reduce(
    (sum, c) => sum + c.tokensInput + c.tokensOutput,
    0,
  );
  const cost = cards.reduce((sum, c) => sum + c.costUsd, 0);

  return (
    <div
      className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs mb-2 flex-wrap"
      style={{
        background: "var(--vscode-badge-background)",
        color: "var(--vscode-badge-foreground)",
      }}
    >
      {active > 0 && (
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {active} running
        </span>
      )}
      {done > 0 && (
        <span style={{ color: "var(--vscode-descriptionForeground)" }}>
          ✓ {done} done
        </span>
      )}
      {tokens > 0 && (
        <span style={{ color: "var(--vscode-descriptionForeground)" }}>
          {formatTokens(tokens)}
        </span>
      )}
      {cost > 0 && (
        <span style={{ color: "var(--vscode-descriptionForeground)" }}>
          ${cost.toFixed(3)}
        </span>
      )}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M tok`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k tok`;
  }
  return `${n} tok`;
}

