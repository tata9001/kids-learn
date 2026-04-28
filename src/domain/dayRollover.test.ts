import { describe, expect, it } from "vitest";
import { copyUnfinishedTasksToToday, rolloverToDate } from "./dayRollover";
import { testState, testTask } from "../test/testState";

describe("day rollover", () => {
  it("creates a new review when the date changes", () => {
    const state = testState();
    const next = rolloverToDate(state, new Date("2026-04-29T07:00:00+08:00"));

    expect(next.todayKey).toBe("2026-04-29");
    expect(next.reviews["2026-04-29"]).toBeDefined();
  });

  it("copies unfinished tasks to the new day without changing yesterday", () => {
    const task = testTask({ status: "not-started", dateKey: "2026-04-28" });
    const state = rolloverToDate(testState({ tasks: { [task.id]: task } }), new Date("2026-04-29T07:00:00+08:00"));
    const next = copyUnfinishedTasksToToday(state, "2026-04-28");
    const copied = Object.values(next.tasks).find((item) => item.dateKey === "2026-04-29");

    expect(copied?.name).toBe(task.name);
    expect(copied?.status).toBe("not-started");
    expect(next.tasks[task.id].dateKey).toBe("2026-04-28");
  });
});
