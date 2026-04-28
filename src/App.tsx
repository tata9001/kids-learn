import { ChildDashboard } from "./components/ChildDashboard";
import { FocusView } from "./components/FocusView";
import { Home } from "./components/Home";
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

function ParentPlaceholder() {
  const { actions } = useStudyStore();
  return (
    <main className="appShell">
      <Header title="家长模式" />
      <h2>今日计划</h2>
      <label>
        任务名称
        <input aria-label="任务名称" />
      </label>
      <button
        onClick={() =>
          actions.addTask({
            name: "语文练习",
            type: "homework",
            subject: "chinese",
            estimatedFocusBlocks: 1,
            completionStandard: "完成并检查一遍",
            requiresConfirmation: true
          })
        }
      >
        添加任务
      </button>
    </main>
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
  if (state.mode === "parent") return <ParentPlaceholder />;

  return (
    <main className="appShell">
      <Home childName={state.profile.childName} onChild={() => actions.setMode("child")} onParent={() => actions.setMode("parent")} />
    </main>
  );
}
