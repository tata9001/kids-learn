import { describe, expect, it } from "vitest";
import {
  createRecurringTaskTemplate,
  generateDueRecurringTasks,
  pauseRecurringTaskTemplate
} from "./recurrence";
import { deleteTask } from "./tasks";
import { testState } from "../test/testState";

describe("recurrence domain", () => {
  it("creates today's task instance when a new template is due today", () => {
    const state = createRecurringTaskTemplate(testState(), {
      name: "当天阅读",
      type: "reading",
      estimatedFocusBlocks: 1,
      completionStandard: "读 15 分钟",
      requiresConfirmation: false,
      recurrence: "daily",
      createdAt: "2026-04-28T08:00:00+08:00"
    });

    expect(state.tasks["task-template-1-2026-04-28"]).toMatchObject({
      name: "当天阅读",
      dateKey: "2026-04-28",
      recurringTemplateId: "template-1"
    });
  });

  it("generates daily task instances once per date", () => {
    const state = createRecurringTaskTemplate(testState(), {
      name: "每日阅读",
      type: "reading",
      estimatedFocusBlocks: 1,
      completionStandard: "读 15 分钟",
      requiresConfirmation: false,
      recurrence: "daily",
      createdAt: "2026-04-28T08:00:00+08:00"
    });

    const generated = generateDueRecurringTasks(state, new Date("2026-04-28T09:00:00+08:00"));
    const generatedAgain = generateDueRecurringTasks(generated, new Date("2026-04-28T10:00:00+08:00"));
    const tasks = Object.values(generatedAgain.tasks).filter((task) => task.name === "每日阅读");

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "task-template-1-2026-04-28",
      dateKey: "2026-04-28",
      status: "not-started",
      recurringTemplateId: "template-1"
    });
    expect(generatedAgain.recurringTaskTemplates["template-1"].generatedDateKeys).toEqual(["2026-04-28"]);
  });

  it("generates weekly tasks only on selected weekdays", () => {
    const state = createRecurringTaskTemplate(testState(), {
      name: "周末整理",
      type: "organization",
      estimatedFocusBlocks: 1,
      completionStandard: "整理书桌",
      requiresConfirmation: true,
      recurrence: "weekly",
      weekdays: [6],
      createdAt: "2026-04-28T08:00:00+08:00"
    });

    const friday = generateDueRecurringTasks(state, new Date("2026-05-01T09:00:00+08:00"));
    expect(Object.values(friday.tasks).filter((task) => task.name === "周末整理")).toHaveLength(0);

    const saturday = generateDueRecurringTasks(friday, new Date("2026-05-02T09:00:00+08:00"));
    expect(Object.values(saturday.tasks).filter((task) => task.name === "周末整理")).toHaveLength(1);
  });

  it("does not generate tasks for paused templates", () => {
    const state = createRecurringTaskTemplate(testState(), {
      name: "每日练字",
      type: "handwriting",
      estimatedFocusBlocks: 1,
      completionStandard: "写一页",
      requiresConfirmation: true,
      recurrence: "daily",
      createdAt: "2026-04-27T08:00:00+08:00"
    });

    const paused = pauseRecurringTaskTemplate(state, "template-1");
    const generated = generateDueRecurringTasks(paused, new Date("2026-04-28T09:00:00+08:00"));

    expect(Object.values(generated.tasks).filter((task) => task.name === "每日练字")).toHaveLength(0);
    expect(generated.recurringTaskTemplates["template-1"].paused).toBe(true);
  });

  it("deleting today's generated instance does not pause future generation", () => {
    const state = createRecurringTaskTemplate(testState(), {
      name: "每日阅读",
      type: "reading",
      estimatedFocusBlocks: 1,
      completionStandard: "读 15 分钟",
      requiresConfirmation: false,
      recurrence: "daily",
      createdAt: "2026-04-28T08:00:00+08:00"
    });
    const generated = generateDueRecurringTasks(state, new Date("2026-04-28T09:00:00+08:00"));
    const deleted = deleteTask(generated, "task-template-1-2026-04-28");
    const tomorrow = {
      ...deleted,
      todayKey: "2026-04-29",
      reviews: {
        ...deleted.reviews,
        "2026-04-29": {
          ...deleted.reviews["2026-04-28"],
          dateKey: "2026-04-29",
          completedTaskIds: [],
          pendingConfirmationIds: []
        }
      }
    };

    const next = generateDueRecurringTasks(tomorrow, new Date("2026-04-29T09:00:00+08:00"));

    expect(next.tasks["task-template-1-2026-04-28"]).toBeUndefined();
    expect(next.tasks["task-template-1-2026-04-29"]).toBeDefined();
    expect(next.recurringTaskTemplates["template-1"].paused).toBe(false);
  });
});
