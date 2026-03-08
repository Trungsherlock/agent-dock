import { createContext, useReducer, useEffect, type ReactNode } from "react";
import vscode from "../vscodeApi";
import type {
  SerializedSession,
  SerializedCohort,
  ExtensionMessage,
  SessionStatus,
} from "../messageProtocol";

const COLOR_PALETTE = [
  "#6b7280",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

export interface BoardList {
  id: string;
  title: string;
  color: string;
  cardIds: string[];
}

export type BoardCard = SerializedSession;

export interface BoardState {
  lists: Record<string, BoardList>;
  cards: Record<string, BoardCard>;
  listOrder: string[];
}

// const empty: BoardState = { lists: {}, cards: {}, listOrder: [] };
const MOCK_STATE: BoardState = {
  listOrder: ["uncategorized", "cohort-auth"],
  lists: {
    uncategorized: {
      id: "uncategorized",
      title: "Uncategorized",
      color: "#6b7280",
      cardIds: ["session-999"],
    },
    "cohort-auth": {
      id: "cohort-auth",
      title: "Auth Refactor",
      color: "#3b82f6",
      cardIds: ["session-001", "session-002"],
    },
  },
  cards: {
    "session-999": {
      id: "session-999",
      name: "Idle Agent",
      cohortId: "uncategorized",
      status: "idle",
      framework: "claude",
      note: "",
      createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
      currentTask: undefined,
      filesTouched: [],
      toolCalls: [],
      tokensInput: 0,
      tokensOutput: 0,
      costUsd: 0,
      contextWindowUsed: 0,
      contextWindowMax: 200000,
    },
    "session-001": {
      id: "session-001",
      name: "JWT Fixer",
      cohortId: "cohort-auth",
      status: "active",
      framework: "claude",
      note: "",
      createdAt: new Date(Date.now() - 1000 * 60 * 4 - 32000).toISOString(),
      updatedAt: new Date().toISOString(),
      currentTask: "Writing fix for missing expiry check on line 42",
      filesTouched: [
        "src/auth/login.ts",
        "src/auth/types.ts",
        "src/auth/middleware.ts",
      ],
      toolCalls: [
        {
          id: "t1",
          name: "Read",
          input: JSON.stringify({ file_path: "src/auth/login.ts" }),
          status: "done",
          startedAt: Date.now() - 5000,
          durationMs: 120,
        },
        {
          id: "t2",
          name: "Bash",
          input: JSON.stringify({ command: 'grep -n "jwt" login.ts' }),
          status: "done",
          startedAt: Date.now() - 4000,
          durationMs: 45,
        },
        {
          id: "t3",
          name: "Write",
          input: JSON.stringify({ file_path: "src/auth/login.ts" }),
          status: "running",
          startedAt: Date.now() - 500,
        },
      ],
      tokensInput: 11200,
      tokensOutput: 1240,
      costUsd: 0.038,
      contextWindowUsed: 11200,
      contextWindowMax: 200000,
    },
    "session-002": {
      id: "session-002",
      name: "Session Fix",
      cohortId: "cohort-auth",
      status: "done",
      framework: "claude",
      note: "",
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      updatedAt: new Date().toISOString(),
      currentTask: "Fixed session expiry handler",
      filesTouched: ["src/auth/session.ts"],
      toolCalls: [
        {
          id: "t4",
          name: "Read",
          input: JSON.stringify({ file_path: "src/auth/session.ts" }),
          status: "done",
          startedAt: Date.now() - 60000,
          durationMs: 88,
        },
        {
          id: "t5",
          name: "Edit",
          input: JSON.stringify({ file_path: "src/auth/session.ts" }),
          status: "done",
          startedAt: Date.now() - 59000,
          durationMs: 210,
        },
      ],
      tokensInput: 4800,
      tokensOutput: 620,
      costUsd: 0.014,
      contextWindowUsed: 4800,
      contextWindowMax: 200000,
    },
  },
};

const empty: BoardState = MOCK_STATE;

type Action =
  | { type: "SYNC"; sessions: SerializedSession[]; cohorts: SerializedCohort[] }
  | {
      type: "MOVE_CARD";
      cardId: string;
      fromListId: string;
      toListId: string;
      toIndex: number;
    }
  | { type: "RENAME_CARD"; cardId: string; name: string }
  | { type: "SET_NOTE"; cardId: string; note: string }
  | { type: "SET_STATUS"; cardId: string; status: SessionStatus }
  | { type: "END_SESSION"; cardId: string }
  | { type: "CREATE_COHORT"; id: string; label: string }
  | { type: "RENAME_COHORT"; id: string; label: string }
  | { type: "DELETE_COHORT"; id: string };

function reducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case "SYNC": {
      const lists: Record<string, BoardList> = {};
      const cards: Record<string, BoardCard> = {};
      action.cohorts.forEach((c, i) => {
        lists[c.id] = {
          id: c.id,
          title: c.label,
          color: COLOR_PALETTE[i % COLOR_PALETTE.length],
          cardIds: [],
        };
      });
      for (const s of action.sessions) {
        cards[s.id] = s;
        if (lists[s.cohortId]) lists[s.cohortId].cardIds.push(s.id);
      }
      return { lists, cards, listOrder: action.cohorts.map((c) => c.id) };
    }

    case "MOVE_CARD": {
      const { cardId, fromListId, toListId, toIndex } = action;
      const fromList = {
        ...state.lists[fromListId],
        cardIds: [...state.lists[fromListId].cardIds],
      };
      fromList.cardIds = fromList.cardIds.filter((id) => id !== cardId);
      if (fromListId === toListId) {
        fromList.cardIds.splice(toIndex, 0, cardId);
        return { ...state, lists: { ...state.lists, [fromListId]: fromList } };
      }
      const toList = {
        ...state.lists[toListId],
        cardIds: [...state.lists[toListId].cardIds],
      };
      toList.cardIds.splice(toIndex, 0, cardId);
      const updatedCard = { ...state.cards[cardId], cohortId: toListId };
      return {
        ...state,
        cards: { ...state.cards, [cardId]: updatedCard },
        lists: { ...state.lists, [fromListId]: fromList, [toListId]: toList },
      };
    }

    case "RENAME_CARD":
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.cardId]: { ...state.cards[action.cardId], name: action.name },
        },
      };

    case "SET_NOTE":
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.cardId]: { ...state.cards[action.cardId], note: action.note },
        },
      };

    case "SET_STATUS":
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.cardId]: {
            ...state.cards[action.cardId],
            status: action.status,
          },
        },
      };

    case "END_SESSION": {
      const card = state.cards[action.cardId];
      if (!card) return state;
      const list = {
        ...state.lists[card.cohortId],
        cardIds: state.lists[card.cohortId].cardIds.filter(
          (id) => id !== action.cardId,
        ),
      };
      const cards = { ...state.cards };
      delete cards[action.cardId];
      return {
        ...state,
        cards,
        lists: { ...state.lists, [card.cohortId]: list },
      };
    }

    case "CREATE_COHORT": {
      const color =
        COLOR_PALETTE[state.listOrder.length % COLOR_PALETTE.length];
      const newList: BoardList = {
        id: action.id,
        title: action.label,
        color,
        cardIds: [],
      };
      return {
        ...state,
        lists: { ...state.lists, [action.id]: newList },
        listOrder: [...state.listOrder, action.id],
      };
    }

    case "RENAME_COHORT":
      return {
        ...state,
        lists: {
          ...state.lists,
          [action.id]: { ...state.lists[action.id], title: action.label },
        },
      };

    case "DELETE_COHORT": {
      const deletedList = state.lists[action.id];
      if (!deletedList) return state;
      // Move cards to uncategorized
      const uncategorized = {
        ...state.lists["uncategorized"],
        cardIds: [
          ...state.lists["uncategorized"].cardIds,
          ...deletedList.cardIds,
        ],
      };
      const updatedCards = { ...state.cards };
      for (const cardId of deletedList.cardIds) {
        updatedCards[cardId] = {
          ...updatedCards[cardId],
          cohortId: "uncategorized",
        };
      }
      const lists: Record<string, BoardList> = {
        ...state.lists,
        uncategorized,
      };
      delete lists[action.id];
      return {
        ...state,
        lists,
        cards: updatedCards,
        listOrder: state.listOrder.filter((id) => id !== action.id),
      };
    }

    default:
      return state;
  }
}

interface BoardContextValue {
  state: BoardState;
  moveCard: (
    cardId: string,
    fromListId: string,
    toListId: string,
    toIndex: number,
  ) => void;
  renameCard: (cardId: string, name: string) => void;
  setNote: (cardId: string, note: string) => void;
  setStatus: (cardId: string, status: SessionStatus) => void;
  endSession: (cardId: string) => void;
  focusSession: (cardId: string) => void;
  resumeSession: (cardId: string) => void;
  newSession: () => void;
  createCohort: (label: string) => void;
  renameCohort: (id: string, label: string) => void;
  deleteCohort: (id: string) => void;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, empty);

  useEffect(() => {
    vscode.postMessage({ command: "ready" });
    const handler = (event: MessageEvent) => {
      const msg = event.data as ExtensionMessage;
      if (msg.command === "stateUpdate") {
        dispatch({
          type: "SYNC",
          sessions: msg.sessions,
          cohorts: msg.cohorts,
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const moveCard = (
    cardId: string,
    fromListId: string,
    toListId: string,
    toIndex: number,
  ) => {
    dispatch({ type: "MOVE_CARD", cardId, fromListId, toListId, toIndex });
    if (fromListId !== toListId) {
      vscode.postMessage({
        command: "moveSession",
        sessionId: cardId,
        newCohortId: toListId,
      });
    }
  };

  const renameCard = (cardId: string, name: string) => {
    dispatch({ type: "RENAME_CARD", cardId, name });
    vscode.postMessage({
      command: "renameSession",
      sessionId: cardId,
      newName: name,
    });
  };

  const setNote = (cardId: string, note: string) => {
    dispatch({ type: "SET_NOTE", cardId, note });
    vscode.postMessage({ command: "setNote", sessionId: cardId, note });
  };

  const setStatus = (cardId: string, status: SessionStatus) => {
    dispatch({ type: "SET_STATUS", cardId, status });
    vscode.postMessage({ command: "setStatus", sessionId: cardId, status });
  };

  const endSession = (cardId: string) => {
    dispatch({ type: "END_SESSION", cardId });
    vscode.postMessage({ command: "endSession", sessionId: cardId });
  };

  const focusSession = (cardId: string) => {
    vscode.postMessage({ command: "focusSession", sessionId: cardId });
  };

  const resumeSession = (cardId: string) => {
    vscode.postMessage({ command: "resumeSession", sessionId: cardId });
  };

  const newSession = () => {
    vscode.postMessage({ command: "newSession" });
  };

  const createCohort = (label: string) => {
    const id = `cohort-${Date.now()}`;
    dispatch({ type: "CREATE_COHORT", id, label });
    vscode.postMessage({ command: "createCohort", label });
  };

  const renameCohort = (id: string, label: string) => {
    dispatch({ type: "RENAME_COHORT", id, label });
    vscode.postMessage({
      command: "renameCohort",
      cohortId: id,
      newLabel: label,
    });
  };

  const deleteCohort = (id: string) => {
    dispatch({ type: "DELETE_COHORT", id });
    vscode.postMessage({ command: "deleteCohort", cohortId: id });
  };

  return (
    <BoardContext.Provider
      value={{
        state,
        moveCard,
        renameCard,
        setNote,
        setStatus,
        endSession,
        focusSession,
        resumeSession,
        newSession,
        createCohort,
        renameCohort,
        deleteCohort,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export { BoardContext };
