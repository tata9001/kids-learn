import { updateDailyGoalReward } from "./rewards";
import type { StudyState, Task } from "./types";

function isHabit(task: Task): boolean {
  return task.type === "reading" || task.type === "handwriting" || task.type === "organization";
}

export function buildCommunicationSuggestion(focusMinutes: number, completedTasks: number, pendingCount: number): string {
  if (focusMinutes > 0 && completedTasks === 0) {
    return "今天可以先肯定孩子已经开始行动，再一起选一个最容易完成的小任务。";
  }
  if (pendingCount > 0) {
    return "有任务等你确认，先看孩子努力过的地方，再温和提出需要调整的一点。";
  }
  if (completedTasks >= 2) {
    return "今天适合表扬孩子坚持完成计划，也可以让孩子讲讲哪一段最顺利。";
  }
  return "今天先把目标放小，鼓励孩子完成一个短专注块就值得被看见。";
}

export function refreshDailyReview(state: StudyState): StudyState {
  const review = state.reviews[state.todayKey];
  const completedTasks = review.completedTaskIds.map((id) => state.tasks[id]).filter(Boolean);
  const completedHabitCount = completedTasks.filter(isHabit).length;
  const completedFocusBlocks = Math.floor(review.focusMinutes / state.settings.focusMinutes);
  const goalMet =
    completedFocusBlocks >= state.settings.dailyGoalFocusBlocks &&
    completedTasks.length >= state.settings.dailyGoalTasks &&
    completedHabitCount >= state.settings.dailyGoalHabits;

  const withSuggestion: StudyState = {
    ...state,
    reviews: {
      ...state.reviews,
      [state.todayKey]: {
        ...review,
        communicationSuggestion: buildCommunicationSuggestion(
          review.focusMinutes,
          completedTasks.length,
          review.pendingConfirmationIds.length
        )
      }
    }
  };

  return updateDailyGoalReward(withSuggestion, goalMet);
}
