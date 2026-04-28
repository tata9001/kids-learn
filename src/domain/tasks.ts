import type { StudyState, Subject, Task, TaskType } from "./types";
import { grantTaskReward } from "./rewards";

export interface NewTaskInput {
  name: string;
  type: TaskType;
  subject?: Subject;
  estimatedFocusBlocks: number;
  completionStandard: string;
  requiresConfirmation: boolean;
  actualReadingMinutes?: number;
  bookName?: string;
}

function nextId(prefix: string, existing: Record<string, unknown>): string {
  return `${prefix}-${Object.keys(existing).length + 1}`;
}

export function addTask(state: StudyState, input: NewTaskInput): StudyState {
  const id = nextId("task", state.tasks);
  const task: Task = {
    id,
    name: input.name.trim(),
    type: input.type,
    subject: input.type === "homework" ? input.subject ?? "other" : undefined,
    estimatedFocusBlocks: input.estimatedFocusBlocks,
    completionStandard: input.completionStandard.trim(),
    requiresConfirmation: input.requiresConfirmation,
    status: "not-started",
    dateKey: state.todayKey,
    actualReadingMinutes: input.actualReadingMinutes,
    bookName: input.bookName?.trim() || undefined
  };

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [id]: task
    }
  };
}

export function markTaskComplete(state: StudyState, taskId: string, completedAt: string): StudyState {
  const task = state.tasks[taskId];
  if (!task || task.status === "completed" || task.status === "waiting-confirmation") {
    return state;
  }

  const nextTask: Task = {
    ...task,
    status: task.requiresConfirmation ? "waiting-confirmation" : "completed",
    completedAt
  };
  const review = state.reviews[task.dateKey];
  const nextState = {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: nextTask
    },
    reviews: {
      ...state.reviews,
      [task.dateKey]: {
        ...review,
        pendingConfirmationIds: task.requiresConfirmation
          ? Array.from(new Set([...review.pendingConfirmationIds, taskId]))
          : review.pendingConfirmationIds,
        completedTaskIds: task.requiresConfirmation
          ? review.completedTaskIds
          : Array.from(new Set([...review.completedTaskIds, taskId]))
      }
    }
  };

  return task.requiresConfirmation ? nextState : grantTaskReward(nextState, taskId);
}

export function confirmTask(state: StudyState, taskId: string): StudyState {
  const task = state.tasks[taskId];
  if (!task || task.status !== "waiting-confirmation") return state;

  const review = state.reviews[task.dateKey];
  const nextState = {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: "completed" as const
      }
    },
    reviews: {
      ...state.reviews,
      [task.dateKey]: {
        ...review,
        pendingConfirmationIds: review.pendingConfirmationIds.filter((id) => id !== taskId),
        completedTaskIds: Array.from(new Set([...review.completedTaskIds, taskId]))
      }
    }
  };

  return grantTaskReward(nextState, taskId);
}

export function requestTaskAdjustment(state: StudyState, taskId: string): StudyState {
  const task = state.tasks[taskId];
  if (!task) return state;
  const review = state.reviews[task.dateKey];

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: "needs-adjustment"
      }
    },
    reviews: {
      ...state.reviews,
      [task.dateKey]: {
        ...review,
        pendingConfirmationIds: review.pendingConfirmationIds.filter((id) => id !== taskId)
      }
    }
  };
}
