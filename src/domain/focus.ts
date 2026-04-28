import { grantFocusReward } from "./rewards";
import type { FocusSession, StudyState } from "./types";

function nextSessionId(existing: Record<string, FocusSession>): string {
  return `session-${Object.keys(existing).length + 1}`;
}

export function startFocusSession(state: StudyState, taskId: string, startedAt: string): StudyState {
  const task = state.tasks[taskId];
  if (!task) return state;

  const id = nextSessionId(state.focusSessions);
  const session: FocusSession = {
    id,
    taskId,
    startedAt,
    plannedMinutes: state.settings.focusMinutes,
    completed: false,
    interruptions: 0
  };

  return {
    ...state,
    mode: "focus",
    activeTaskId: taskId,
    activeSessionId: id,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: "focusing"
      }
    },
    focusSessions: {
      ...state.focusSessions,
      [id]: session
    }
  };
}

export function getRemainingSeconds(startedAt: string, plannedMinutes: number, now = new Date()): number {
  const elapsedMs = now.getTime() - new Date(startedAt).getTime();
  const plannedMs = plannedMinutes * 60 * 1000;
  return Math.max(0, Math.ceil((plannedMs - elapsedMs) / 1000));
}

export function completeFocusSession(state: StudyState, endedAt: string): StudyState {
  if (!state.activeSessionId) return state;
  const session = state.focusSessions[state.activeSessionId];
  if (!session || session.completed) return state;

  const task = state.tasks[session.taskId];
  const completedSession = {
    ...session,
    endedAt,
    completed: true
  };
  const next = {
    ...state,
    mode: "child" as const,
    activeSessionId: undefined,
    focusSessions: {
      ...state.focusSessions,
      [session.id]: completedSession
    },
    tasks: task
      ? {
          ...state.tasks,
          [task.id]: {
            ...task,
            status: "not-started" as const
          }
        }
      : state.tasks
  };

  return grantFocusReward(next, session.plannedMinutes);
}

export function recordInterruption(state: StudyState): StudyState {
  if (!state.activeSessionId) return state;
  const session = state.focusSessions[state.activeSessionId];
  if (!session) return state;

  return {
    ...state,
    focusSessions: {
      ...state.focusSessions,
      [session.id]: {
        ...session,
        interruptions: session.interruptions + 1
      }
    }
  };
}
