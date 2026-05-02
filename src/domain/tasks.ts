import type { CompletionDetails, StudyState, Subject, Task, TaskType } from "./types";
import { grantTaskReward } from "./rewards";

export interface NewTaskInput {
  name: string;
  type: TaskType;
  subject?: Subject;
  estimatedFocusBlocks: number;
  completionStandard: string;
  requiresConfirmation: boolean;
}

export type UpdateTaskInput = Partial<Omit<NewTaskInput, "subject">> & {
  subject?: Subject;
};

export interface CompletionDetailsInput {
  childNote?: string;
  difficulty?: CompletionDetails["difficulty"];
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
    dateKey: state.todayKey
  };

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [id]: task
    }
  };
}

function normalizeCompletionDetails(input?: CompletionDetailsInput): CompletionDetails | undefined {
  if (!input) return undefined;
  const actualReadingMinutes =
    typeof input.actualReadingMinutes === "number" &&
    Number.isFinite(input.actualReadingMinutes) &&
    input.actualReadingMinutes >= 1 &&
    input.actualReadingMinutes <= 240
      ? Math.round(input.actualReadingMinutes)
      : undefined;
  const details: CompletionDetails = {
    childNote: input.childNote?.trim() || undefined,
    difficulty: input.difficulty,
    actualReadingMinutes,
    bookName: input.bookName?.trim() || undefined
  };

  return Object.values(details).some((value) => value !== undefined) ? details : undefined;
}

export function updateTask(state: StudyState, taskId: string, input: UpdateTaskInput): StudyState {
  const task = state.tasks[taskId];
  if (!task || task.status !== "not-started") return state;

  const nextTask: Task = {
    ...task,
    name: input.name === undefined ? task.name : input.name.trim(),
    type: input.type ?? task.type,
    subject: (input.type ?? task.type) === "homework" ? input.subject ?? task.subject ?? "other" : undefined,
    estimatedFocusBlocks: input.estimatedFocusBlocks ?? task.estimatedFocusBlocks,
    completionStandard:
      input.completionStandard === undefined ? task.completionStandard : input.completionStandard.trim(),
    requiresConfirmation: input.requiresConfirmation ?? task.requiresConfirmation
  };

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: nextTask
    }
  };
}

export function deleteTask(state: StudyState, taskId: string): StudyState {
  const task = state.tasks[taskId];
  if (!task || task.status !== "not-started") return state;
  const { [taskId]: _removed, ...tasks } = state.tasks;

  return {
    ...state,
    tasks
  };
}

export function cancelTask(state: StudyState, taskId: string, canceledAt: string): StudyState {
  const task = state.tasks[taskId];
  if (!task || task.status === "completed" || task.status === "archived") return state;

  return {
    ...state,
    activeTaskId: state.activeTaskId === taskId ? undefined : state.activeTaskId,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: "canceled",
        canceledAt
      }
    }
  };
}

export function archiveTask(state: StudyState, taskId: string, archivedAt: string): StudyState {
  const task = state.tasks[taskId];
  if (!task || task.status === "not-started") return state;

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: "archived",
        archivedAt
      }
    }
  };
}

export function markTaskComplete(
  state: StudyState,
  taskId: string,
  completedAt: string,
  details?: CompletionDetailsInput
): StudyState {
  const task = state.tasks[taskId];
  if (
    !task ||
    task.status === "completed" ||
    task.status === "waiting-confirmation" ||
    task.status === "canceled" ||
    task.status === "archived"
  ) {
    return state;
  }

  const nextTask: Task = {
    ...task,
    status: task.requiresConfirmation ? "waiting-confirmation" : "completed",
    completionDetails: normalizeCompletionDetails(details) ?? task.completionDetails,
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

export function confirmTask(state: StudyState, taskId: string, parentComment?: string): StudyState {
  const task = state.tasks[taskId];
  if (!task || task.status !== "waiting-confirmation") return state;

  const review = state.reviews[task.dateKey];
  const nextState = {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: "completed" as const,
        parentComment: parentComment?.trim() || task.parentComment
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
