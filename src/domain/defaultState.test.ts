import { describe, expect, it } from "vitest";
import { createDefaultState } from "./defaultState";
import { todayKey } from "./date";

describe("createDefaultState", () => {
  it("creates tablet-first fake-login state with parent and child modes available", () => {
    const state = createDefaultState(new Date("2026-04-28T08:00:00+08:00"));

    expect(state.profile.childName).toBe("小朋友");
    expect(state.mode).toBe("home");
    expect(state.settings.focusMinutes).toBe(15);
    expect(state.settings.restMinutes).toBe(5);
    expect(state.settings.focusPresentation).toBe("quiet");
    expect(state.todayKey).toBe("2026-04-28");
    expect(state.reviews[state.todayKey].dateKey).toBe("2026-04-28");
    expect(state.version).toBe(2);
    expect(state.recurringTaskTemplates).toEqual({});
    expect(state.pet.experience).toBe(0);
    expect(state.pet.experienceToNextLevel).toBe(40);
    expect(state.pet.recentReward).toContain("小猫");
    expect(state.pet.nextUnlock).toContain("铃铛");
    expect(state.childCompanionProfile).toEqual({
      gradeBand: "unknown",
      favoriteColors: [],
      favoriteDecorations: [],
      trickySubjects: []
    });
    expect(state.pendingKittenMemoryCandidates).toEqual([]);
    expect(state.approvedKittenMemories).toEqual([]);
  });

  it("uses stable date keys", () => {
    expect(todayKey(new Date("2026-04-28T23:59:59+08:00"))).toBe("2026-04-28");
  });
});
