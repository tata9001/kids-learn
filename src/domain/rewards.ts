import type { PetState, StudyState } from "./types";

const STREAK_UNLOCKS: Record<number, string> = {
  3: "kitten-bell",
  7: "cloud-cat-bed",
  14: "star-whisker-badge"
};

const LEVEL_UNLOCKS: Record<number, string> = {
  2: "铃铛小猫",
  3: "云朵小猫",
  4: "星星小猫"
};

function experienceToNextLevel(level: number): number {
  return 40 + (level - 1) * 20;
}

function nextUnlock(level: number): string {
  const nextLevel = level + 1;
  const unlock = LEVEL_UNLOCKS[nextLevel];
  return unlock ? `等级 ${nextLevel} 解锁${unlock}` : "继续升级，解锁更多小猫装饰";
}

function addPetExperience(pet: PetState, amount: number, recentReward: string): PetState {
  let level = pet.level;
  let experience = pet.experience + amount;
  let threshold = pet.experienceToNextLevel;

  while (experience >= threshold) {
    experience -= threshold;
    level += 1;
    threshold = experienceToNextLevel(level);
  }

  return {
    ...pet,
    level,
    experience,
    experienceToNextLevel: threshold,
    recentReward,
    nextUnlock: nextUnlock(level)
  };
}

export function grantFocusReward(state: StudyState, minutes: number): StudyState {
  const review = state.reviews[state.todayKey];

  return {
    ...state,
    pet: {
      ...addPetExperience(state.pet, 10, "完成一个专注块，小猫获得 10 点经验"),
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
  if (task.rewardGranted) return state;

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        rewardGranted: true
      }
    },
    pet: {
      ...addPetExperience(state.pet, 20, "完成一个任务，小猫获得照顾道具和 20 点经验"),
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
  const pet = addPetExperience(state.pet, 15, "连续完成每日目标，小猫获得 15 点经验");

  return {
    ...state,
    pet: {
      ...pet,
      level: unlock && pet.level === state.pet.level ? pet.level + 1 : pet.level,
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
