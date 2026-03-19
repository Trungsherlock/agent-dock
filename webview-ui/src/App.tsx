import { BoardProvider } from "./context/BoardContext";
import { AgentBoard } from "./components/AgentBoard";

export default function App() {
  return (
    <BoardProvider>
      <div
        className="w-full h-full overflow-hidden"
        style={{ fontFamily: "var(--vscode-font-family)" }}
      >
        <AgentBoard />
      </div>
    </BoardProvider>
  );
}
