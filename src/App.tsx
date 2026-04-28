import { Home } from "./components/Home";
import { PetPanel } from "./components/PetPanel";
import { useStudyStore } from "./state/useStudyStore";

function Header({ title }: { title: string }) {
  const { actions } = useStudyStore();
  return (
    <header className="topBar">
      <h1>{title}</h1>
      <button onClick={() => actions.setMode("home")}>回到首页</button>
    </header>
  );
}

function ChildPlaceholder() {
  const { state } = useStudyStore();
  return (
    <main className="appShell">
      <Header title="孩子模式" />
      <PetPanel pet={state.pet} />
      <h2>今日任务</h2>
    </main>
  );
}

function ParentPlaceholder() {
  return (
    <main className="appShell">
      <Header title="家长模式" />
      <h2>今日计划</h2>
    </main>
  );
}

export function App() {
  const { state, actions } = useStudyStore();

  if (state.mode === "child") return <ChildPlaceholder />;
  if (state.mode === "parent") return <ParentPlaceholder />;

  return (
    <main className="appShell">
      <Home childName={state.profile.childName} onChild={() => actions.setMode("child")} onParent={() => actions.setMode("parent")} />
    </main>
  );
}
