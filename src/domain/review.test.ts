import { describe, expect, it } from "vitest";
import { buildCommunicationSuggestion, refreshDailyReview } from "./review";
import { testState, testTask } from "../test/testState";

describe("review", () => {
  it("suggests praising the start when focus happened but few tasks completed", () => {
    expect(buildCommunicationSuggestion(15, 0, 0)).toContain("开始");
  });

  it("marks daily goal met when focus, task, and habit goals are reached", () => {
    const homework = testTask({ id: "task-1", type: "homework", status: "completed" });
    const habit = testTask({ id: "task-2", type: "reading", subject: undefined, status: "completed" });
    const state = testState({
      settings: { ...testState().settings, dailyGoalFocusBlocks: 1, dailyGoalTasks: 2, dailyGoalHabits: 1 },
      tasks: { [homework.id]: homework, [habit.id]: habit },
      reviews: {
        "2026-04-28": {
          ...testState().reviews["2026-04-28"],
          completedTaskIds: [homework.id, habit.id],
          focusMinutes: 15
        }
      }
    });

    const next = refreshDailyReview(state);
    expect(next.reviews["2026-04-28"].dailyGoalMet).toBe(true);
    expect(next.pet.streakDays).toBe(1);
  });
});
