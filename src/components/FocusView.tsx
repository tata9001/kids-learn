import { useEffect, useMemo, useState } from "react";
import { getRemainingSeconds } from "../domain/focus";
import { useStudyStore } from "../state/useStudyStore";
import { PetPanel } from "./PetPanel";

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function FocusView() {
  const { state, actions } = useStudyStore();
  const session = state.activeSessionId ? state.focusSessions[state.activeSessionId] : undefined;
  const task = session ? state.tasks[session.taskId] : undefined;
  const [showStuck, setShowStuck] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = useMemo(
    () => (session ? getRemainingSeconds(session.startedAt, session.plannedMinutes, now) : 0),
    [now, session]
  );

  if (!session || !task) {
    return (
      <section className="screenGrid">
        <p>没有正在进行的专注。</p>
        <button onClick={() => actions.setMode("child")}>回到今日任务</button>
      </section>
    );
  }

  return (
    <section className={`focusScreen ${state.settings.focusPresentation}`}>
      <PetPanel pet={state.pet} />
      <p className="eyebrow">专注中</p>
      <h2>{task.name}</h2>
      <div className="timerDisplay" aria-label="剩余时间">
        {formatSeconds(remaining)}
      </div>
      {state.settings.focusPresentation === "lively" && <p className="encouragement">小猫在旁边陪你，一次只做这一件事。</p>}
      <div className="focusActions">
        <button className="secondaryButton" onClick={() => setShowStuck(true)}>
          我卡住了
        </button>
        <button className="primaryButton" onClick={actions.completeFocus}>
          完成本轮专注
        </button>
      </div>
      {showStuck && (
        <div className="stuckPanel">
          <button onClick={() => setShowStuck(false)}>先做 5 分钟</button>
          <button onClick={() => actions.setMode("child")}>换一个任务</button>
          <button onClick={actions.interruptFocus}>请家长帮我看一下</button>
        </div>
      )}
    </section>
  );
}
