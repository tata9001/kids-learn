import { useStudyStore } from "../state/useStudyStore";
import { PetPanel } from "./PetPanel";
import { TaskCard } from "./TaskCard";

export function ChildDashboard() {
  const { state, actions } = useStudyStore();
  const todayTasks = Object.values(state.tasks).filter((task) => task.dateKey === state.todayKey);

  return (
    <section className="screenGrid">
      <PetPanel pet={state.pet} />
      <div className="sectionHeader">
        <h2>今日任务</h2>
        <p>选一个任务，先开始一个短短的专注块。</p>
      </div>
      <div className="taskList">
        {todayTasks.length === 0 ? (
          <p className="emptyHint">今天还没有任务，请家长先添加。</p>
        ) : (
          todayTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={() => actions.startFocus(task.id)}
              onComplete={() => actions.markComplete(task.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
