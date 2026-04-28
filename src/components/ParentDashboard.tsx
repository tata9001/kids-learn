import { useState } from "react";
import type { FocusPresentation, TaskType } from "../domain/types";
import { useStudyStore } from "../state/useStudyStore";
import { exportStudyState } from "../storage/localStore";
import { ReviewPanel } from "./ReviewPanel";
import { TaskCard } from "./TaskCard";

export function ParentDashboard() {
  const { state, actions } = useStudyStore();
  const [name, setName] = useState("");
  const [type, setType] = useState<TaskType>("homework");
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const todayTasks = Object.values(state.tasks).filter((task) => task.dateKey === state.todayKey);
  const review = state.reviews[state.todayKey];
  const previousDateKeys = Object.keys(state.reviews).filter((key) => key !== state.todayKey).sort().reverse();
  const latestPreviousDateKey = previousDateKeys[0];

  return (
    <section className="parentGrid">
      <section className="panel">
        <h2>今日计划</h2>
        <label>
          任务名称
          <input aria-label="任务名称" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          任务类型
          <select aria-label="任务类型" value={type} onChange={(event) => setType(event.target.value as TaskType)}>
            <option value="homework">作业</option>
            <option value="reading">阅读</option>
            <option value="handwriting">练字</option>
            <option value="organization">整理</option>
          </select>
        </label>
        <label>
          <input
            aria-label="不需要家长确认"
            type="checkbox"
            checked={!requiresConfirmation}
            onChange={(event) => setRequiresConfirmation(!event.target.checked)}
          />
          不需要家长确认
        </label>
        <button
          className="primaryButton"
          onClick={() =>
            actions.addTask({
              name,
              type,
              subject: type === "homework" ? "chinese" : undefined,
              estimatedFocusBlocks: 1,
              completionStandard: type === "reading" ? "读 15 分钟" : "完成后检查一遍",
              requiresConfirmation
            })
          }
        >
          添加任务
        </button>
      </section>

      <section className="panel">
        <h2>规则设置</h2>
        <label>
          专注时长
          <select
            aria-label="专注时长"
            value={state.settings.focusMinutes}
            onChange={(event) => actions.updateSettings({ focusMinutes: Number(event.target.value) as 10 | 15 | 20 })}
          >
            <option value="10">10 分钟</option>
            <option value="15">15 分钟</option>
            <option value="20">20 分钟</option>
          </select>
        </label>
        <p>{state.settings.focusMinutes} 分钟</p>
        <label>
          专注页模式
          <select
            aria-label="专注页模式"
            value={state.settings.focusPresentation}
            onChange={(event) => actions.updateSettings({ focusPresentation: event.target.value as FocusPresentation })}
          >
            <option value="quiet">安静模式</option>
            <option value="lively">活泼模式</option>
          </select>
        </label>
      </section>

      <section className="panel widePanel">
        <h2>任务确认</h2>
        <div className="taskList">
          {todayTasks.map((task) => (
            <div key={task.id} className="confirmationRow">
              <TaskCard task={task} />
              {task.status === "waiting-confirmation" && (
                <div className="taskActions">
                  <button className="primaryButton" onClick={() => actions.confirm(task.id)}>
                    确认
                  </button>
                  <button className="secondaryButton" onClick={() => actions.adjust(task.id)}>
                    再调整
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <ReviewPanel review={review} />

      <section className="panel">
        <h2>数据</h2>
        {latestPreviousDateKey && (
          <button className="secondaryButton" onClick={() => actions.copyUnfinished(latestPreviousDateKey)}>
            复制昨日未完成任务
          </button>
        )}
        <button className="secondaryButton" onClick={() => window.alert(exportStudyState())}>
          导出数据
        </button>
        <button className="secondaryButton" onClick={actions.resetData}>
          清空数据
        </button>
      </section>
    </section>
  );
}
