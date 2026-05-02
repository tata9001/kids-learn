import { useState } from "react";
import type { FocusPresentation, RecurrenceKind, Task, TaskType } from "../domain/types";
import { useStudyStore } from "../state/useStudyStore";
import { exportStudyState } from "../storage/localStore";
import { ReviewPanel } from "./ReviewPanel";
import { TaskCard } from "./TaskCard";

export function ParentDashboard() {
  const { state, actions } = useStudyStore();
  const [name, setName] = useState("");
  const [type, setType] = useState<TaskType>("homework");
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [recurrence, setRecurrence] = useState<RecurrenceKind>("once");
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editName, setEditName] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const todayTasks = Object.values(state.tasks).filter((task) => task.dateKey === state.todayKey);
  const review = state.reviews[state.todayKey];
  const previousDateKeys = Object.keys(state.reviews).filter((key) => key !== state.todayKey).sort().reverse();
  const latestPreviousDateKey = previousDateKeys[0];

  function addPlanTask() {
    const input = {
      name,
      type,
      subject: type === "homework" ? ("chinese" as const) : undefined,
      estimatedFocusBlocks: 1,
      completionStandard: type === "reading" ? "读 15 分钟" : "完成后检查一遍",
      requiresConfirmation
    };
    if (recurrence === "once") {
      actions.addTask(input);
    } else {
      actions.addRecurringTask({
        ...input,
        recurrence,
        weekdays: recurrence === "weekly" ? weekdays : undefined
      });
    }
  }

  function beginEdit(task: Task) {
    setEditingTask(task);
    setEditName(task.name);
  }

  function saveEdit() {
    if (!editingTask) return;
    actions.updateTask(editingTask.id, { name: editName });
    setEditingTask(null);
    setEditName("");
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort()));
  }

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
          重复设置
          <select aria-label="重复设置" value={recurrence} onChange={(event) => setRecurrence(event.target.value as RecurrenceKind)}>
            <option value="once">只今天</option>
            <option value="daily">每天</option>
            <option value="weekly">每周几天</option>
          </select>
        </label>
        {recurrence === "weekly" && (
          <div className="weekdayRow" aria-label="每周重复日期">
            {["日", "一", "二", "三", "四", "五", "六"].map((label, index) => (
              <button
                key={label}
                className={weekdays.includes(index) ? "primaryButton" : "secondaryButton"}
                type="button"
                onClick={() => toggleWeekday(index)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
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
          onClick={addPlanTask}
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
              {editingTask?.id === task.id ? (
                <section className="editTaskPanel">
                  <label>
                    编辑任务名称
                    <input aria-label="编辑任务名称" value={editName} onChange={(event) => setEditName(event.target.value)} />
                  </label>
                  <button className="primaryButton" onClick={saveEdit}>
                    保存任务
                  </button>
                </section>
              ) : (
                <TaskCard task={task} />
              )}
              {task.status === "not-started" && (
                <div className="taskActions">
                  <button className="secondaryButton" onClick={() => beginEdit(task)} aria-label={`编辑 ${task.name}`}>
                    编辑
                  </button>
                  <button className="secondaryButton" onClick={() => actions.deleteTask(task.id)} aria-label={`删除 ${task.name}`}>
                    删除
                  </button>
                </div>
              )}
              {task.status !== "not-started" && task.status !== "archived" && (
                <div className="taskActions">
                  <button className="secondaryButton" onClick={() => actions.cancelTask(task.id)} aria-label={`取消 ${task.name}`}>
                    取消今日任务
                  </button>
                  <button className="secondaryButton" onClick={() => actions.archiveTask(task.id)} aria-label={`归档 ${task.name}`}>
                    归档
                  </button>
                </div>
              )}
              {task.status === "waiting-confirmation" && (
                <div className="taskActions">
                  <label>
                    确认评语
                    <input
                      aria-label={`确认评语 ${task.name}`}
                      value={comments[task.id] ?? ""}
                      onChange={(event) => setComments((current) => ({ ...current, [task.id]: event.target.value }))}
                    />
                  </label>
                  <button className="primaryButton" onClick={() => actions.confirm(task.id, comments[task.id])} aria-label={`确认 ${task.name}`}>
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

      {Object.values(state.recurringTaskTemplates).length > 0 && (
        <section className="panel widePanel">
          <h2>重复任务</h2>
          <div className="taskList">
            {Object.values(state.recurringTaskTemplates).map((template) => (
              <div key={template.id} className="confirmationRow">
                <div>
                  <h3>{template.name}</h3>
                  <p>{template.paused ? "已暂停" : template.recurrence === "daily" ? "每天" : "每周重复"}</p>
                </div>
                {!template.paused && (
                  <button className="secondaryButton" onClick={() => actions.pauseRecurringTask(template.id)}>
                    暂停重复任务
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
