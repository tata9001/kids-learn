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

  it("returns fallback when stored data is invalid", () => {
    localStorage.setItem("study-companion-state", "{broken");

    const loaded = loadStudyState();
    expect(loaded.profile.childName).toBe("小朋友");
  });

  it("exports and clears data", () => {
    const state = testState();
    saveStudyState(state);

    expect(exportStudyState()).toContain('"version": 1');
    clearStudyState();
    expect(localStorage.getItem("study-companion-state")).toBeNull();
  });
});
