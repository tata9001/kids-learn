import { ChildDashboard } from "./components/ChildDashboard";
import { FocusView } from "./components/FocusView";
import { Home } from "./components/Home";
import { ParentDashboard } from "./components/ParentDashboard";
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

export function App() {
  const { state, actions } = useStudyStore();

  if (state.mode === "focus") {
    return (
      <main className="appShell">
        <FocusView />
      </main>
    );
  }

  if (state.mode === "child") {
    return (
      <main className="appShell">
        <Header title="孩子模式" />
        <ChildDashboard />
      </main>
    );
  }
  if (state.mode === "parent") {
    return (
      <main className="appShell">
        <Header title="家长模式" />
        <ParentDashboard />
      </main>
    );
  }

  return (
    <main className="appShell">
      <Home childName={state.profile.childName} onChild={() => actions.setMode("child")} onParent={() => actions.setMode("parent")} />
    </main>
  );
}
