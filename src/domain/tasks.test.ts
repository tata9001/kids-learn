import { describe, expect, it } from "vitest";
import {
  addTask,
  archiveTask,
  cancelTask,
  confirmTask,
  deleteTask,
  markTaskComplete,
  requestTaskAdjustment,
  updateTask
} from "./tasks";
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

    const confirmed = confirmTask(state, task.id, "你这次检查得很认真");
    expect(confirmed.tasks[task.id].status).toBe("completed");
    expect(confirmed.tasks[task.id].parentComment).toBe("你这次检查得很认真");
    expect(requestTaskAdjustment(state, task.id).tasks[task.id].status).toBe("needs-adjustment");
  });

  it("updates and deletes only not-started tasks", () => {
    const draft = testTask({ id: "task-1", status: "not-started" });
    const completed = testTask({ id: "task-2", status: "completed", name: "已完成任务" });
    const state = testState({
      tasks: {
        [draft.id]: draft,
        [completed.id]: completed
      }
    });

    const updated = updateTask(state, draft.id, {
      name: "新的阅读任务",
      type: "reading",
      subject: undefined,
      estimatedFocusBlocks: 2,
      completionStandard: "读完一章",
      requiresConfirmation: false
    });
    expect(updated.tasks[draft.id]).toMatchObject({
      name: "新的阅读任务",
      type: "reading",
      subject: undefined,
      estimatedFocusBlocks: 2,
      completionStandard: "读完一章",
      requiresConfirmation: false
    });

    const blockedUpdate = updateTask(updated, completed.id, { name: "不应修改" });
    expect(blockedUpdate.tasks[completed.id].name).toBe("已完成任务");

    const deleted = deleteTask(updated, draft.id);
    expect(deleted.tasks[draft.id]).toBeUndefined();

    const blockedDelete = deleteTask(updated, completed.id);
    expect(blockedDelete.tasks[completed.id]).toBeDefined();
  });

  it("cancels active tasks and archives historical tasks without removing records", () => {
    const active = testTask({ id: "task-1", status: "focusing" });
    const completed = testTask({ id: "task-2", status: "completed" });
    const state = testState({
      activeTaskId: active.id,
      tasks: {
        [active.id]: active,
        [completed.id]: completed
      }
    });

    const canceled = cancelTask(state, active.id, "2026-04-28T09:00:00+08:00");
    expect(canceled.tasks[active.id].status).toBe("canceled");
    expect(canceled.tasks[active.id].canceledAt).toBe("2026-04-28T09:00:00+08:00");
    expect(canceled.activeTaskId).toBeUndefined();

    const archived = archiveTask(canceled, completed.id, "2026-04-28T10:00:00+08:00");
    expect(archived.tasks[completed.id].status).toBe("archived");
    expect(archived.tasks[completed.id].archivedAt).toBe("2026-04-28T10:00:00+08:00");
  });

  it("stores child completion details for reading tasks", () => {
    const task = testTask({ requiresConfirmation: false, type: "reading", subject: undefined });
    const state = testState({ tasks: { [task.id]: task } });

    const next = markTaskComplete(state, task.id, "2026-04-28T09:00:00+08:00", {
      childNote: "读完第一章",
      difficulty: "a-little",
      actualReadingMinutes: 18,
      bookName: "小猫数学"
    });

    expect(next.tasks[task.id].completionDetails).toEqual({
      childNote: "读完第一章",
      difficulty: "a-little",
      actualReadingMinutes: 18,
      bookName: "小猫数学"
    });
    expect(next.tasks[task.id].status).toBe("completed");
  });
});
