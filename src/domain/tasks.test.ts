import { describe, expect, it } from "vitest";
import { addTask, confirmTask, markTaskComplete, requestTaskAdjustment } from "./tasks";
import { testState, testTask } from "../test/testState";

describe("task domain", () => {
  it("adds homework tasks with medium detail", () => {
    const state = testState();
    const next = addTask(state, {
      name: "数学口算",
      type: "homework",
      subject: "math",
      estimatedFocusBlocks: 2,
      completionStandard: "完成一页并检查",
      requiresConfirmation: true
    });

    const task = Object.values(next.tasks)[0];
    expect(task.name).toBe("数学口算");
    expect(task.subject).toBe("math");
    expect(task.status).toBe("not-started");
    expect(task.dateKey).toBe("2026-04-28");
  });

  it("moves confirmation-required tasks to waiting confirmation", () => {
    const task = testTask({ requiresConfirmation: true });
    const state = testState({ tasks: { [task.id]: task } });
    const next = markTaskComplete(state, task.id, "2026-04-28T09:00:00+08:00");

    expect(next.tasks[task.id].status).toBe("waiting-confirmation");
    expect(next.reviews["2026-04-28"].pendingConfirmationIds).toContain(task.id);
  });

  it("completes self-check tasks immediately", () => {
    const task = testTask({ requiresConfirmation: false, type: "reading", subject: undefined });
    const state = testState({ tasks: { [task.id]: task } });
    const next = markTaskComplete(state, task.id, "2026-04-28T09:00:00+08:00");

    expect(next.tasks[task.id].status).toBe("completed");
    expect(next.reviews["2026-04-28"].completedTaskIds).toContain(task.id);
    expect(next.pet.careItems).toBe(1);
  });

  it("confirms or adjusts pending tasks with gentle states", () => {
    const task = testTask({ status: "waiting-confirmation" });
    const state = testState({
      tasks: { [task.id]: task },
      reviews: {
        "2026-04-28": {
          ...testState().reviews["2026-04-28"],
          pendingConfirmationIds: [task.id]
        }
      }
    });

    expect(confirmTask(state, task.id).tasks[task.id].status).toBe("completed");
    expect(requestTaskAdjustment(state, task.id).tasks[task.id].status).toBe("needs-adjustment");
  });
});
