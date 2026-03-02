import { createContext, useReducer, useEffect, type ReactNode } from 'react';
import vscode from '../vscodeApi';
import type { SerializedSession, SerializedCategory, ExtensionMessage, SessionStatus } from '../messageProtocol';

export interface BoardList {
    id: string;
    title: string;
    icon: string;
    color: string;
    cardIds: string[];
}

export type BoardCard = SerializedSession;

export interface BoardState {
    lists: Record<string, BoardList>;
    cards: Record<string, BoardCard>;
    listOrder: string[];
}

const empty: BoardState = { lists: {}, cards: {}, listOrder: [] };

type Action = 
    | { type: 'SYNC'; sessions: SerializedSession[]; categories: SerializedCategory[] }
    | { type: 'MOVE_CARD'; cardId: string; fromListId: string; toListId: string; toIndex: number }
    | { type: 'RENAME_CARD'; cardId: string; name: string }
    | { type: 'SET_NOTE'; cardId: string; note: string }
    | { type: 'SET_STATUS'; cardId: string, status: SessionStatus }
    | { type: 'END_SESSION'; cardId: string };

function reducer(state: BoardState, action: Action): BoardState {
    switch (action.type) {
        case "SYNC": {
            const lists: Record<string, BoardList> = {};
            const cards: Record<string, BoardCard> = {};
            for (const c of action.categories) {
                lists[c.id] = {
                    id: c.id,
                    title: c.label,
                    icon: c.icon,
                    color: c.color,
                    cardIds: [],
                };
            }
            for (const s of action.sessions) {
                cards[s.id] = s;
                if (lists[s.categoryId]) lists[s.categoryId].cardIds.push(s.id);
            }
            return { lists, cards, listOrder: action.categories.map((c) => c.id) };
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
                return {
                    ...state,
                    lists: { ...state.lists, [fromListId]: fromList },
                };
            }

            const toList = {
                ...state.lists[toListId],
                cardIds: [...state.lists[toListId].cardIds],
            };
            toList.cardIds.splice(toIndex, 0, cardId);
            const updatedCard = { ...state.cards[cardId], categoryId: toListId };
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
                    [action.cardId]: {
                        ...state.cards[action.cardId],
                        name: action.name,
                    },
                },
            };

        case "SET_NOTE":
            return {
                ...state,
                cards: {
                    ...state.cards,
                    [action.cardId]: {
                        ...state.cards[action.cardId],
                        note: action.note,
                    },
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

        case 'END_SESSION': {
            const card = state.cards[action.cardId];
            if (!card) return state;
            const list = { ...state.lists[card.categoryId], cardIds: state.lists[card.categoryId].cardIds.filter(id => id !== action.cardId) };
            const cards = { ...state.cards };
            delete cards[action.cardId];
            return { ...state, cards, lists: { ...state.lists, [card.categoryId]: list } };
        }

        default:
            return state;
    }
}

interface BoardContextValue {
    state: BoardState;
    moveCard: (cardId: string, fromListId: string, toListId: string, toIndex: number) => void;
    renameCard: (cardId: string, name: string) => void;
    setNote: (cardId: string, note: string) => void;
    setStatus: (cardId: string, status: SessionStatus) => void;
    endSession: (cardId: string) => void;
    focusSession: (cardId: string) => void;
    newSession: () => void;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, empty);

    useEffect(() => {
        vscode.postMessage({ command: 'ready' });
        const handler = (event: MessageEvent) => {
            const msg = event.data as ExtensionMessage;
            if (msg.command === 'stateUpdate') {
                dispatch({ type: 'SYNC', sessions: msg.sessions, categories: msg.categories });
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    const moveCard = (cardId: string, fromListId: string, toListId: string, toIndex: number) => {
        dispatch({ type: 'MOVE_CARD', cardId, fromListId, toListId, toIndex });
        if (fromListId !== toListId) {
            vscode.postMessage({ command: 'moveSession', sessionId: cardId, newCategoryId: toListId });
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

    const newSession = () => {
      vscode.postMessage({ command: "newSession" });
    };

    return (
        <BoardContext.Provider value={{ state, moveCard, renameCard, setNote, setStatus, endSession, focusSession, newSession}}>
            {children}
        </BoardContext.Provider>
    );
}

export { BoardContext };