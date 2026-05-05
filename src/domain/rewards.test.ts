import { describe, expect, it } from "vitest";
import { grantFocusReward, grantTaskReward, interactWithPet, updateDailyGoalReward } from "./rewards";
import { testState, testTask } from "../test/testState";

describe("rewards", () => {
  it("adds energy, xp, and recent reward for completed focus blocks", () => {
    const next = grantFocusReward(testState(), 15);

    expect(next.pet.energy).toBe(50);
    expect(next.pet.experience).toBe(10);
    expect(next.pet.mood).toBe("happy");
    expect(next.pet.recentReward).toContain("专注");
    expect(next.reviews["2026-04-28"].focusMinutes).toBe(15);
  });

  it("adds care item, xp, and recent reward for completed tasks once", () => {
    const task = testTask({ status: "completed" });
    const state = testState({ tasks: { [task.id]: task } });
    const next = grantTaskReward(state, task.id);
    const repeated = grantTaskReward(next, task.id);

    expect(next.pet.careItems).toBe(1);
    expect(next.pet.experience).toBe(20);
    expect(next.pet.recentReward).toContain("任务");
    expect(next.reviews["2026-04-28"].completedTaskIds).toContain(task.id);
    expect(repeated.pet.careItems).toBe(1);
    expect(repeated.pet.experience).toBe(20);
  });

  it("carries overflow xp into the next kitten level", () => {
    const task = testTask({ status: "completed" });
    const state = testState({
      tasks: { [task.id]: task },
      pet: {
        ...testState().pet,
        experience: 35,
        experienceToNextLevel: 40
      }
    });

    const next = grantTaskReward(state, task.id);

    expect(next.pet.level).toBe(2);
    expect(next.pet.experience).toBe(15);
    expect(next.pet.experienceToNextLevel).toBe(60);
    expect(next.pet.nextUnlock).toContain("云朵");
  });

  it("unlocks kitten upgrades at 3, 7, and 14 day streaks", () => {
    const state = testState({
      pet: { ...testState().pet, streakDays: 2 }
    });

    const next = updateDailyGoalReward(state, true);

    expect(next.pet.streakDays).toBe(3);
    expect(next.pet.unlockedDecorations).toContain("kitten-bell");
    expect(next.pet.experience).toBe(15);
    expect(next.pet.recentReward).toContain("连续");
  });

  it("uses fish treats to feed the kitten and save a collection memory", () => {
    const state = testState({
      pet: { ...testState().pet, careItems: 2, energy: 40 }
    });

    const next = interactWithPet(state, "feed");

    expect(next.pet.careItems).toBe(1);
    expect(next.pet.energy).toBe(48);
    expect(next.pet.unlockedDecorations).toContain("fed-kitten");
    expect(next.pet.recentReward).toContain("小鱼干");
  });

  it("spends energy on play and turns it into kitten experience", () => {
    const state = testState({
      pet: { ...testState().pet, energy: 40, experience: 38 }
    });

    const next = interactWithPet(state, "play");

    expect(next.pet.energy).toBe(30);
    expect(next.pet.experience).toBe(3);
    expect(next.pet.level).toBe(2);
    expect(next.pet.unlockedDecorations).toContain("playtime-spark");
    expect(next.pet.recentReward).toContain("玩");
  });
});
