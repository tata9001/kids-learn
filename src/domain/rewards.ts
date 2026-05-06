import type { PetState, StudyState } from "./types";
import { getCatDecoration, getNextCatUnlock, MAX_CAT_LEVEL } from "./cats";

const STREAK_UNLOCKS: Record<number, string> = {
  3: "kitten-bell",
  7: "cloud-cat-bed",
  14: "star-whisker-badge"
};

const MAX_ENERGY = 100;
export type PetInteraction = "pet" | "feed" | "play";

function experienceToNextLevel(level: number): number {
  return 40 + (level - 1) * 20;
}

function clampEnergy(energy: number): number {
  return Math.min(MAX_ENERGY, Math.max(0, energy));
}

function addPetExperience(pet: PetState, amount: number, recentReward: string): PetState {
  let level = pet.level;
  let experience = pet.experience + amount;
  let threshold = pet.experienceToNextLevel;

  while (experience >= threshold && level < MAX_CAT_LEVEL) {
    experience -= threshold;
    level += 1;
    threshold = experienceToNextLevel(level);
  }

  if (level >= MAX_CAT_LEVEL) {
    experience = Math.min(experience, threshold);
  }

  return {
    ...pet,
    level,
    experience,
    experienceToNextLevel: threshold,
    recentReward,
    nextUnlock: getNextCatUnlock(level)
  };
}

function addCollection(pet: PetState, collectionId: string): string[] {
  return Array.from(new Set([...pet.unlockedDecorations, collectionId]));
}

function addOwnedDecoration(pet: PetState, decorationId: string): string[] {
  return Array.from(new Set([...(pet.ownedDecorationIds ?? []), decorationId]));
}

export function grantFocusReward(state: StudyState, minutes: number): StudyState {
  const review = state.reviews[state.todayKey];

  return {
    ...state,
    pet: {
      ...addPetExperience(state.pet, 10, "完成一个专注块，小猫获得 10 点经验"),
      energy: clampEnergy(state.pet.energy + 10),
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
      streakDays: nextStreak,
      unlockedDecorations: unlock ? addCollection(state.pet, unlock) : state.pet.unlockedDecorations
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

export function interactWithPet(state: StudyState, interaction: PetInteraction): StudyState {
  if (interaction === "pet") {
    return {
      ...state,
      pet: {
        ...state.pet,
        mood: "happy",
        recentReward: "喵，小猫蹭了蹭你"
      }
    };
  }

  if (interaction === "feed") {
    if (state.pet.careItems <= 0) {
      return {
        ...state,
        pet: {
          ...state.pet,
          recentReward: "小鱼干不够，完成任务后就能再喂小猫"
        }
      };
    }

    return {
      ...state,
      pet: {
        ...state.pet,
        careItems: state.pet.careItems - 1,
        energy: clampEnergy(state.pet.energy + 8),
        mood: "happy",
        unlockedDecorations: addCollection(state.pet, "fed-kitten"),
        recentReward: "小猫吃到小鱼干，今天更有精神了"
      }
    };
  }

  if (state.pet.energy < 10) {
    return {
      ...state,
      pet: {
        ...state.pet,
        recentReward: "小猫想先补充一点能量，再一起玩"
      }
    };
  }

  const pet = addPetExperience(
    {
      ...state.pet,
      energy: clampEnergy(state.pet.energy - 10),
      unlockedDecorations: addCollection(state.pet, "playtime-spark")
    },
    5,
    "你陪小猫玩了一会儿，小猫获得 5 点经验"
  );

  return {
    ...state,
    pet: {
      ...pet,
      mood: "proud"
    }
  };
}

export function purchasePetDecoration(state: StudyState, decorationId: string): StudyState {
  const decoration = getCatDecoration(decorationId);
  if (!decoration) return state;
  const ownedDecorationIds = state.pet.ownedDecorationIds ?? [];

  if (ownedDecorationIds.includes(decorationId)) {
    return equipPetDecoration(state, decorationId);
  }

  if (state.pet.careItems < decoration.cost) {
    return {
      ...state,
      pet: {
        ...state.pet,
        recentReward: `还差 ${decoration.cost - state.pet.careItems} 个小鱼干才能兑换${decoration.name}`
      }
    };
  }

  return {
    ...state,
    pet: {
      ...state.pet,
      careItems: state.pet.careItems - decoration.cost,
      ownedDecorationIds: addOwnedDecoration(state.pet, decorationId),
      equippedDecorationId: decorationId,
      unlockedDecorations: addCollection(state.pet, `decoration-${decorationId}`),
      mood: "proud",
      recentReward: `小猫穿上了${decoration.name}`
    }
  };
}

export function equipPetDecoration(state: StudyState, decorationId: string): StudyState {
  const decoration = getCatDecoration(decorationId);
  if (!decoration || !(state.pet.ownedDecorationIds ?? []).includes(decorationId)) return state;

  return {
    ...state,
    pet: {
      ...state.pet,
      equippedDecorationId: decorationId,
      mood: "happy",
      recentReward: `小猫换上了${decoration.name}`
    }
  };
}

export function removePetDecoration(state: StudyState): StudyState {
  if (!state.pet.equippedDecorationId) return state;

  return {
    ...state,
    pet: {
      ...state.pet,
      equippedDecorationId: undefined,
      mood: "calm",
      recentReward: "小猫把装饰收好了，想换时还能再穿上"
    }
  };
}
