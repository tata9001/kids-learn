import { createEmptyReview } from "./defaultState";
import { todayKey } from "./date";
import { generateDueRecurringTasks } from "./recurrence";
import type { StudyState, Task } from "./types";

export function rolloverToDate(state: StudyState, date: Date): StudyState {
  const key = todayKey(date);
  if (key === state.todayKey) return state;

  return generateDueRecurringTasks(
    {
      ...state,
      todayKey: key,
      activeTaskId: undefined,
      activeSessionId: undefined,
      mode: "home",
      reviews: {
        ...state.reviews,
        [key]: state.reviews[key] ?? createEmptyReview(key)
      }
    },
    date
  );
}

export function copyUnfinishedTasksToToday(state: StudyState, fromDateKey: string): StudyState {
  const unfinished = Object.values(state.tasks).filter(
    (task) => task.dateKey === fromDateKey && task.status !== "completed"
  );
  const copiedTasks = unfinished.reduce<Record<string, Task>>((acc, task, index) => {
    const id = `task-${Object.keys(state.tasks).length + index + 1}`;
    acc[id] = {
      ...task,
      id,
      dateKey: state.todayKey,
      status: "not-started",
      completedAt: undefined
    };
    return acc;
  }, {});

  return {
    ...state,
    tasks: {
      ...state.tasks,
      ...copiedTasks
    }
  };
}
