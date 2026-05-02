import { useState } from "react";
import type { DifficultyLevel, Task } from "../domain/types";
import { useStudyStore } from "../state/useStudyStore";
import { PetPanel } from "./PetPanel";
import { TaskCard } from "./TaskCard";

export function ChildDashboard() {
  const { state, actions } = useStudyStore();
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [childNote, setChildNote] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("none");
  const [actualReadingMinutes, setActualReadingMinutes] = useState("");
  const [bookName, setBookName] = useState("");
  const todayTasks = Object.values(state.tasks).filter(
    (task) => task.dateKey === state.todayKey && task.status !== "canceled" && task.status !== "archived"
  );

  function submitCompletion() {
    if (!completingTask) return;
    actions.markComplete(completingTask.id, {
      childNote,
      difficulty,
      actualReadingMinutes: actualReadingMinutes ? Number(actualReadingMinutes) : undefined,
      bookName
    });
    setCompletingTask(null);
    setChildNote("");
    setDifficulty("none");
    setActualReadingMinutes("");
    setBookName("");
  }

  return (
    <section className="screenGrid">
      <PetPanel pet={state.pet} />
      <div className="sectionHeader">
        <h2>今日任务</h2>
        <p>选一个任务，先开始一个短短的专注块。</p>
      </div>
      <div className="taskList">
        {completingTask && (
          <section className="completionPanel">
            <h3>{completingTask.name}</h3>
            <label>
              完成说明
              <textarea aria-label="完成说明" value={childNote} onChange={(event) => setChildNote(event.target.value)} />
            </label>
            <label>
              困难程度
              <select aria-label="困难程度" value={difficulty} onChange={(event) => setDifficulty(event.target.value as DifficultyLevel)}>
                <option value="none">没有</option>
                <option value="a-little">有一点</option>
                <option value="needs-parent">需要家长看看</option>
              </select>
            </label>
            {completingTask.type === "reading" && (
              <>
                <label>
                  实际阅读分钟
                  <input
                    aria-label="实际阅读分钟"
                    inputMode="numeric"
                    value={actualReadingMinutes}
                    onChange={(event) => setActualReadingMinutes(event.target.value)}
                  />
                </label>
                <label>
                  书名
                  <input aria-label="书名" value={bookName} onChange={(event) => setBookName(event.target.value)} />
                </label>
              </>
            )}
            <div className="taskActions">
              <button className="primaryButton" onClick={submitCompletion}>
                提交完成
              </button>
              <button className="secondaryButton" onClick={() => setCompletingTask(null)}>
                取消
              </button>
            </div>
          </section>
        )}
        {todayTasks.length === 0 ? (
          <p className="emptyHint">今天还没有任务，请家长先添加。</p>
        ) : (
          todayTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={() => actions.startFocus(task.id)}
              onComplete={() => setCompletingTask(task)}
            />
          ))
        )}
      </div>
    </section>
  );
}
