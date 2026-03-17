import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useBoardContext } from "../context/useBoardContext";
import { SubAgentList } from "./SubAgentList";

type ScopeId = "global" | "project";

export function SubAgentTab({ visible }: { visible: boolean }) {
  const { subAgents } = useBoardContext();
  const [listOrder, setListOrder] = useState<ScopeId[]>(["global", "project"]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.index === destination.index) return;
    if (type !== "LIST") return;

    const newOrder = [...listOrder];
    const [removed] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, removed);
    setListOrder(newOrder);
  };

  const globalAgents = subAgents.filter((a) => a.scope === "global");
  const projectAgents = subAgents.filter((a) => a.scope === "project");
  const agentsByScope = { global: globalAgents, project: projectAgents };

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
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="subagent-board" type="LIST">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {listOrder.map((scope, index) => (
                <Draggable key={scope} draggableId={`subagent-list-${scope}`} index={index}>
                  {(provided) => (
                    <SubAgentList
                      scope={scope}
                      agents={agentsByScope[scope]}
                      innerRef={provided.innerRef}
                      draggableProps={provided.draggableProps}
                      dragHandleProps={provided.dragHandleProps}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
