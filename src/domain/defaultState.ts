import { todayKey } from "./date";
import type { DailyReview, StudyState } from "./types";

export function createEmptyReview(dateKey: string): DailyReview {
  return {
    dateKey,
    completedTaskIds: [],
    focusMinutes: 0,
    restCount: 0,
    pendingConfirmationIds: [],
    communicationSuggestion: "今天先关注孩子愿意开始的那一刻，及时肯定行动。",
    dailyGoalMet: false
  };
}

export function createDefaultState(now = new Date()): StudyState {
  const key = todayKey(now);

  return {
    version: 2,
    mode: "home",
    todayKey: key,
    profile: {
      familyName: "我的家庭",
      childName: "小朋友"
    },
    settings: {
      focusMinutes: 15,
      restMinutes: 5,
      focusPresentation: "quiet",
      dailyGoalFocusBlocks: 3,
      dailyGoalTasks: 2,
      dailyGoalHabits: 1
    },
    tasks: {},
    recurringTaskTemplates: {},
    focusSessions: {},
    pet: {
      level: 1,
      energy: 40,
      experience: 0,
      experienceToNextLevel: 40,
      mood: "calm",
      careItems: 0,
      unlockedDecorations: [],
      ownedDecorationIds: [],
      equippedDecorationId: undefined,
      streakDays: 0,
      recentReward: "小猫在等第一个学习奖励",
      nextUnlock: "等级 2 解锁铃铛小猫"
    },
    reviews: {
      [key]: createEmptyReview(key)
    },
    childCompanionProfile: {
      gradeBand: "unknown",
      favoriteColors: [],
      favoriteDecorations: [],
      trickySubjects: []
    },
    pendingKittenMemoryCandidates: [],
    approvedKittenMemories: []
  };
}
