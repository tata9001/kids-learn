import { describe, expect, it } from "vitest";
import { grantFocusReward, grantTaskReward, updateDailyGoalReward } from "./rewards";
import { testState, testTask } from "../test/testState";

describe("rewards", () => {
  it("adds 10 energy and happy mood for completed focus blocks", () => {
    const next = grantFocusReward(testState(), 15);

    expect(next.pet.energy).toBe(10);
    expect(next.pet.mood).toBe("happy");
    expect(next.reviews["2026-04-28"].focusMinutes).toBe(15);
  });

  it("adds care item for completed tasks", () => {
    const task = testTask({ status: "completed" });
    const state = testState({ tasks: { [task.id]: task } });
    const next = grantTaskReward(state, task.id);

    expect(next.pet.careItems).toBe(1);
    expect(next.reviews["2026-04-28"].completedTaskIds).toContain(task.id);
  });

  it("unlocks kitten upgrades at 3, 7, and 14 day streaks", () => {
    const state = testState({
      pet: { ...testState().pet, streakDays: 2 }
    });

    const next = updateDailyGoalReward(state, true);

    expect(next.pet.streakDays).toBe(3);
    expect(next.pet.unlockedDecorations).toContain("kitten-bell");
  });
});
