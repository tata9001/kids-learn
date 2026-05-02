import { beforeEach, describe, expect, it } from "vitest";
import { clearStudyState, exportStudyState, loadStudyState, saveStudyState } from "./localStore";
import { testState } from "../test/testState";

describe("localStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads versioned state", () => {
    const state = testState();
    saveStudyState(state);

    expect(loadStudyState()).toEqual(state);
  });

  it("migrates version 1 data without losing family progress", () => {
    localStorage.setItem(
      "study-companion-state",
      JSON.stringify({
        version: 1,
        mode: "parent",
        todayKey: "2026-04-28",
        profile: { familyName: "王家", childName: "安安" },
        settings: {
          focusMinutes: 20,
          restMinutes: 5,
          focusPresentation: "lively",
          dailyGoalFocusBlocks: 3,
          dailyGoalTasks: 2,
          dailyGoalHabits: 1
        },
        tasks: {
          "task-1": {
            id: "task-1",
            name: "读故事",
            type: "reading",
            estimatedFocusBlocks: 1,
            completionStandard: "读 15 分钟",
            requiresConfirmation: false,
            status: "completed",
            dateKey: "2026-04-28",
            actualReadingMinutes: 18,
            bookName: "小猫数学",
            completedAt: "2026-04-28T10:00:00+08:00"
          }
        },
        focusSessions: {},
        pet: {
          level: 2,
          energy: 30,
          mood: "happy",
          careItems: 1,
          unlockedDecorations: ["kitten-bell"],
          streakDays: 3
        },
        reviews: {
          "2026-04-28": {
            dateKey: "2026-04-28",
            completedTaskIds: ["task-1"],
            focusMinutes: 20,
            restCount: 1,
            pendingConfirmationIds: [],
            communicationSuggestion: "继续鼓励",
            dailyGoalMet: true
          }
        }
      })
    );

    const loaded = loadStudyState();

    expect(loaded.version).toBe(2);
    expect(loaded.profile.childName).toBe("安安");
    expect(loaded.settings.focusMinutes).toBe(20);
    expect(loaded.recurringTaskTemplates).toEqual({});
    expect(loaded.tasks["task-1"].completionDetails).toEqual({
      actualReadingMinutes: 18,
      bookName: "小猫数学"
    });
    expect(loaded.pet.level).toBe(2);
    expect(loaded.pet.experience).toBe(0);
    expect(loaded.pet.experienceToNextLevel).toBe(40);
    expect(loaded.pet.recentReward).toContain("小猫");
    expect(loaded.reviews["2026-04-28"].completedTaskIds).toEqual(["task-1"]);
  });

  it("returns fallback when stored data is invalid", () => {
    localStorage.setItem("study-companion-state", "{broken");

    const loaded = loadStudyState();
    expect(loaded.profile.childName).toBe("小朋友");
  });

  it("exports and clears data", () => {
    const state = testState();
    saveStudyState(state);

    expect(exportStudyState()).toContain('"version": 2');
    clearStudyState();
    expect(localStorage.getItem("study-companion-state")).toBeNull();
  });
});
