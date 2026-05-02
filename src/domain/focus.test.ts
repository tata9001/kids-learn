import { describe, expect, it } from "vitest";
import { completeFocusSession, getRemainingSeconds, recordInterruption, startFocusSession } from "./focus";
import { testState, testTask } from "../test/testState";

describe("focus sessions", () => {
  it("starts a session and moves the task into focusing", () => {
    const task = testTask();
    const state = testState({ tasks: { [task.id]: task } });
    const next = startFocusSession(state, task.id, "2026-04-28T08:00:00+08:00");

    expect(next.activeTaskId).toBe(task.id);
    expect(next.tasks[task.id].status).toBe("focusing");
    expect(Object.values(next.focusSessions)[0].plannedMinutes).toBe(15);
  });

  it("recovers remaining seconds from stored start time", () => {
    const remaining = getRemainingSeconds(
      "2026-04-28T08:00:00+08:00",
      15,
      new Date("2026-04-28T08:05:30+08:00")
    );

    expect(remaining).toBe(570);
  });

  it("grants focus reward only for completed sessions", () => {
    const task = testTask();
    const started = startFocusSession(testState({ tasks: { [task.id]: task } }), task.id, "2026-04-28T08:00:00+08:00");
    const completed = completeFocusSession(started, "2026-04-28T08:15:00+08:00");

    expect(completed.pet.energy).toBe(50);
    expect(completed.pet.experience).toBe(10);
    expect(completed.reviews["2026-04-28"].focusMinutes).toBe(15);
    expect(completed.activeSessionId).toBeUndefined();
  });

  it("records interruptions without granting rewards", () => {
    const task = testTask();
    const started = startFocusSession(testState({ tasks: { [task.id]: task } }), task.id, "2026-04-28T08:00:00+08:00");
    const interrupted = recordInterruption(started);
    const session = Object.values(interrupted.focusSessions)[0];

    expect(session.interruptions).toBe(1);
    expect(interrupted.pet.energy).toBe(40);
    expect(interrupted.pet.experience).toBe(0);
  });
});
