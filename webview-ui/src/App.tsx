import { BoardProvider } from "./context/BoardContext";
import { Board } from "./components/Board";

export default function App() {
  return (
    <BoardProvider>
      <div
        className="w-full h-full overflow-hidden"
        style={{ fontFamily: "var(--vscode-font-family)" }}
      >
        <Board />
      </div>
    </BoardProvider>
  );
}
