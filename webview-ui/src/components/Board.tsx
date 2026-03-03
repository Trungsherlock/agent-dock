import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useBoardContext } from "../context/useBoardContext";
import { List } from "./List";

export function Board() {
  const { state, moveCard } = useBoardContext();

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

  if (state.listOrder.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-xs"
        style={{ color: "var(--vscode-descriptionForeground)" }}
      >
        Loading...
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
        {state.listOrder.map((listId) => {
          const list = state.lists[listId];
          if (!list) return null;
          return <List key={listId} list={list} />;
        })}
      </div>
    </DragDropContext>
  );
}
