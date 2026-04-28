import { createDefaultState } from "../domain/defaultState";
import type { StudyState, Task } from "../domain/types";

export function testState(overrides: Partial<StudyState> = {}): StudyState {
  return {
    ...createDefaultState(new Date("2026-04-28T08:00:00+08:00")),
    ...overrides
  };
}

export function testTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    name: "语文练习",
    type: "homework",
    subject: "chinese",
    estimatedFocusBlocks: 1,
    completionStandard: "完成并检查一遍",
    requiresConfirmation: true,
    status: "not-started",
    dateKey: "2026-04-28",
    ...overrides
  };
}
