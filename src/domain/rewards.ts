import type { StudyState } from "./types";

const STREAK_UNLOCKS: Record<number, string> = {
  3: "kitten-bell",
  7: "cloud-cat-bed",
  14: "star-whisker-badge"
};

export function grantFocusReward(state: StudyState, minutes: number): StudyState {
  const review = state.reviews[state.todayKey];

  return {
    ...state,
    pet: {
      ...state.pet,
      energy: state.pet.energy + 10,
      mood: "happy"
    },
    reviews: {
      ...state.reviews,
      [state.todayKey]: {
        ...review,
        focusMinutes: review.focusMinutes + minutes
      }
    }
  };
}

export function grantTaskReward(state: StudyState, taskId: string): StudyState {
  const task = state.tasks[taskId];
  if (!task) return state;
  const review = state.reviews[task.dateKey];

  return {
    ...state,
    pet: {
      ...state.pet,
      mood: "proud",
      careItems: state.pet.careItems + 1
    },
    reviews: {
      ...state.reviews,
      [task.dateKey]: {
        ...review,
        completedTaskIds: Array.from(new Set([...review.completedTaskIds, taskId]))
      }
    }
  };
}

export function updateDailyGoalReward(state: StudyState, goalMet: boolean): StudyState {
  const review = state.reviews[state.todayKey];
  if (!goalMet || review.dailyGoalMet) return state;

  const nextStreak = state.pet.streakDays + 1;
  const unlock = STREAK_UNLOCKS[nextStreak];

  return {
    ...state,
    pet: {
      ...state.pet,
      level: unlock ? state.pet.level + 1 : state.pet.level,
      streakDays: nextStreak,
      unlockedDecorations: unlock
        ? Array.from(new Set([...state.pet.unlockedDecorations, unlock]))
        : state.pet.unlockedDecorations
    },
    reviews: {
      ...state.reviews,
      [state.todayKey]: {
        ...review,
        dailyGoalMet: true
      }
    }
  };
}
