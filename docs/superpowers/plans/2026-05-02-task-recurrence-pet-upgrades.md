# Task Recurrence And Pet Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editable tasks, completion details, recurring task templates, and clearer kitten pet XP progression without losing existing local data.

**Architecture:** Keep business rules in `src/domain/*`, keep persistence migration in `src/storage/localStore.ts`, and keep React components as thin callers of typed store actions. Recurring tasks are templates that generate ordinary dated task instances idempotently before dashboards render.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, localStorage, CSS.

---

## File Structure

- `src/domain/types.ts`: Add version 2 state, recurrence, completion detail, cancellation/archive, parent comment, and pet XP types.
- `src/domain/defaultState.ts`: Seed version 2 defaults and default kitten XP fields.
- `src/domain/tasks.ts`: Add task update, delete, cancel, archive, completion detail, and parent comment transitions.
- `src/domain/tasks.test.ts`: Unit coverage for task management and completion details.
- `src/domain/recurrence.ts`: New recurring template creation, update, pause, and idempotent generation rules.
- `src/domain/recurrence.test.ts`: Unit coverage for daily and weekly generation, no duplicates, and paused templates.
- `src/domain/rewards.ts`: Add XP gain, level threshold, recent reward, next unlock, and duplicate reward protection.
- `src/domain/rewards.test.ts`: Unit coverage for XP, overflow leveling, rewards, and streak unlocks.
- `src/domain/dayRollover.ts`: Generate due recurring tasks during date rollover.
- `src/storage/localStore.ts`: Migrate version 1 saved states to version 2 with safe defaults.
- `src/storage/localStore.test.ts`: Verify migration preserves existing tasks, reviews, settings, and pet state.
- `src/state/useStudyStore.tsx`: Expose new task, recurrence, completion detail, and confirmation comment actions.
- `src/components/ParentDashboard.tsx`: Add edit/delete/cancel/archive controls, recurrence controls, template pause controls, and parent comment input.
- `src/components/TaskCard.tsx`: Render recurring, canceled, archived, completion detail, and reading detail metadata.
- `src/components/ChildDashboard.tsx`: Hide canceled/archived tasks and open completion detail step before completion.
- `src/components/PetPanel.tsx`: Show XP progress, recent reward, next unlock, care items, energy, streak, and kitten stage.
- `src/App.test.tsx`: Add integration flows for edit/delete, completion details, parent comment, recurrence, and pet progress.
- `src/styles.css`: Add responsive controls and compact detail styles.
- `vite.config.ts`: Exclude `.worktrees/**` from Vitest so stale worktree tests do not run as part of current main.

## Implementation Tasks

### Task 1: Version 2 Types And Defaults

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/defaultState.ts`
- Modify: `src/test/testState.ts`
- Test: `src/domain/defaultState.test.ts`

- [ ] **Step 1: Write failing tests for version 2 defaults**

Add assertions that default state has `version: 2`, an empty `recurringTaskTemplates` object, and kitten pet fields:

```ts
expect(state.version).toBe(2);
expect(state.recurringTaskTemplates).toEqual({});
expect(state.pet.experience).toBe(0);
expect(state.pet.experienceToNextLevel).toBe(40);
expect(state.pet.recentReward).toContain("小猫");
expect(state.pet.nextUnlock).toContain("铃铛");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/domain/defaultState.test.ts`

Expected: FAIL because `StudyState.version` is still `1` and pet XP fields do not exist.

- [ ] **Step 3: Extend types**

In `src/domain/types.ts`, add:

```ts
export type TaskStatus =
  | "not-started"
  | "focusing"
  | "child-marked-complete"
  | "waiting-confirmation"
  | "completed"
  | "needs-adjustment"
  | "canceled"
  | "archived";

export type DifficultyLevel = "none" | "a-little" | "needs-parent";
export type RecurrenceKind = "once" | "daily" | "weekly";

export interface CompletionDetails {
  childNote?: string;
  difficulty?: DifficultyLevel;
  actualReadingMinutes?: number;
  bookName?: string;
}

export interface RecurrenceRule {
  kind: RecurrenceKind;
  weekdays: number[];
}

export interface RecurringTaskTemplate {
  id: string;
  name: string;
  type: TaskType;
  subject?: Subject;
  estimatedFocusBlocks: number;
  completionStandard: string;
  requiresConfirmation: boolean;
  recurrence: Exclude<RecurrenceKind, "once">;
  weekdays: number[];
  paused: boolean;
  createdAt: string;
  generatedDateKeys: string[];
}
```

Extend `Task`, `PetState`, and `StudyState` with template links, completion details, parent confirmation comment, cancellation/archive timestamps, XP fields, and `recurringTaskTemplates`.

- [ ] **Step 4: Update defaults and builders**

Set the default state to version 2:

```ts
pet: {
  level: 1,
  energy: 40,
  experience: 0,
  experienceToNextLevel: 40,
  mood: "calm",
  careItems: 0,
  unlockedDecorations: [],
  streakDays: 0,
  recentReward: "小猫在等第一个学习奖励",
  nextUnlock: "等级 2 解锁铃铛小猫"
},
recurringTaskTemplates: {}
```

- [ ] **Step 5: Run tests and commit**

Run: `TZ=Asia/Shanghai npm test -- src/domain/defaultState.test.ts`

Expected: PASS.

Commit: `git add src/domain/types.ts src/domain/defaultState.ts src/test/testState.ts src/domain/defaultState.test.ts && git commit -m "feat: add version 2 study state model"`

### Task 2: Local Storage Migration

**Files:**
- Modify: `src/storage/localStore.ts`
- Modify: `src/storage/localStore.test.ts`

- [ ] **Step 1: Write failing migration tests**

Add a version 1 fixture with tasks, settings, reviews, and old pet fields. Assert loading returns version 2, preserves existing values, adds `recurringTaskTemplates: {}`, and fills pet XP defaults.

- [ ] **Step 2: Verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/storage/localStore.test.ts`

Expected: FAIL because `isStudyState` only accepts version 1 and does not migrate.

- [ ] **Step 3: Implement migration**

Add `migrateStudyState(value: unknown): StudyState` that accepts valid version 2 as-is, upgrades valid version 1, and falls back to `createDefaultState()` for invalid data. Preserve old `task.actualReadingMinutes` and `task.bookName` by moving them into `task.completionDetails` only when present.

- [ ] **Step 4: Verify GREEN and commit**

Run: `TZ=Asia/Shanghai npm test -- src/storage/localStore.test.ts`

Expected: PASS.

Commit: `git add src/storage/localStore.ts src/storage/localStore.test.ts && git commit -m "feat: migrate local study state to version 2"`

### Task 3: Task Management And Completion Details

**Files:**
- Modify: `src/domain/tasks.ts`
- Modify: `src/domain/tasks.test.ts`

- [ ] **Step 1: Write failing task management tests**

Cover these behaviors:

```ts
updateTask(state, taskId, { name: "新阅读", estimatedFocusBlocks: 2 });
deleteTask(state, taskId);
cancelTask(state, activeTaskId, "2026-05-02T09:00:00.000Z");
archiveTask(state, completedTaskId, "2026-05-02T10:00:00.000Z");
markTaskComplete(state, readingTaskId, "2026-05-02T10:30:00.000Z", {
  childNote: "读完第一章",
  difficulty: "a-little",
  actualReadingMinutes: 18,
  bookName: "小猫数学"
});
confirmTask(state, taskId, "这次很专心");
```

Assert `updateTask` and `deleteTask` only work on `not-started`, cancel/archive preserve task records, completion details are saved, and parent comments are saved on confirmation.

- [ ] **Step 2: Verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/domain/tasks.test.ts`

Expected: FAIL because the functions and fields do not exist yet.

- [ ] **Step 3: Implement task transitions**

Add `UpdateTaskInput`, `CompletionDetailsInput`, `updateTask`, `deleteTask`, `cancelTask`, and `archiveTask`. Change `markTaskComplete` to accept optional details and validate reading minutes as a finite number from 1 to 240. Change `confirmTask` to accept optional `parentComment`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `TZ=Asia/Shanghai npm test -- src/domain/tasks.test.ts`

Expected: PASS.

Commit: `git add src/domain/tasks.ts src/domain/tasks.test.ts && git commit -m "feat: add task management transitions"`

### Task 4: Recurring Task Templates

**Files:**
- Create: `src/domain/recurrence.ts`
- Create: `src/domain/recurrence.test.ts`
- Modify: `src/domain/dayRollover.ts`
- Modify: `src/domain/dayRollover.test.ts`

- [ ] **Step 1: Write failing recurrence tests**

Cover daily generation, weekly selected weekday generation, duplicate prevention when called twice for the same date, paused template behavior, and deleting today's generated instance without pausing the template.

- [ ] **Step 2: Verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/domain/recurrence.test.ts src/domain/dayRollover.test.ts`

Expected: FAIL because `src/domain/recurrence.ts` does not exist.

- [ ] **Step 3: Implement recurrence rules**

Create:

```ts
export function createRecurringTaskTemplate(state: StudyState, input: NewTaskInput & { recurrence: "daily" | "weekly"; weekdays?: number[]; createdAt: string }): StudyState
export function pauseRecurringTaskTemplate(state: StudyState, templateId: string): StudyState
export function generateDueRecurringTasks(state: StudyState, date: Date): StudyState
```

Use `generatedDateKeys` for idempotency. Generated task IDs should be stable enough to avoid duplicates, for example `task-${template.id}-${dateKey}`.

- [ ] **Step 4: Wire date rollover**

Call `generateDueRecurringTasks` inside `rolloverToDate` after the date key is updated and the review exists.

- [ ] **Step 5: Verify GREEN and commit**

Run: `TZ=Asia/Shanghai npm test -- src/domain/recurrence.test.ts src/domain/dayRollover.test.ts`

Expected: PASS.

Commit: `git add src/domain/recurrence.ts src/domain/recurrence.test.ts src/domain/dayRollover.ts src/domain/dayRollover.test.ts && git commit -m "feat: generate recurring study tasks"`

### Task 5: Pet XP And Reward Visibility

**Files:**
- Modify: `src/domain/rewards.ts`
- Modify: `src/domain/rewards.test.ts`

- [ ] **Step 1: Write failing reward tests**

Assert focus rewards add energy and XP, task rewards add care item and XP once, XP overflow levels up, `recentReward` updates after reward events, `nextUnlock` points at the next kitten milestone, and repeated task confirmation cannot grant duplicate task rewards.

- [ ] **Step 2: Verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/domain/rewards.test.ts`

Expected: FAIL because XP logic does not exist.

- [ ] **Step 3: Implement reward helpers**

Add `addPetExperience(pet, amount, reason)` and milestone helpers. Suggested amounts: focus block `10 XP`, task completion `20 XP`, daily goal `15 XP`. Keep streak decoration unlocks as kitten decorations.

- [ ] **Step 4: Verify GREEN and commit**

Run: `TZ=Asia/Shanghai npm test -- src/domain/rewards.test.ts`

Expected: PASS.

Commit: `git add src/domain/rewards.ts src/domain/rewards.test.ts && git commit -m "feat: add kitten xp rewards"`

### Task 6: Store Actions

**Files:**
- Modify: `src/state/useStudyStore.tsx`
- Modify: `src/state/useStudyStore.test.tsx`

- [ ] **Step 1: Write failing store tests**

Exercise the public actions for update/delete/cancel/archive, recurring template creation and pause, completion details, and parent confirmation comment.

- [ ] **Step 2: Verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/state/useStudyStore.test.tsx`

Expected: FAIL because store actions do not exist.

- [ ] **Step 3: Implement store action wrappers**

Expose `updateTask`, `deleteTask`, `cancelTask`, `archiveTask`, `addRecurringTask`, `pauseRecurringTask`, `markComplete(taskId, details)`, and `confirm(taskId, parentComment)`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `TZ=Asia/Shanghai npm test -- src/state/useStudyStore.test.tsx`

Expected: PASS.

Commit: `git add src/state/useStudyStore.tsx src/state/useStudyStore.test.tsx && git commit -m "feat: expose recurrence and task management actions"`

### Task 7: Parent And Child UI

**Files:**
- Modify: `src/components/ParentDashboard.tsx`
- Modify: `src/components/ChildDashboard.tsx`
- Modify: `src/components/TaskCard.tsx`
- Modify: `src/components/PetPanel.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing integration tests**

Cover:
- Parent creates, edits, and deletes a `not-started` task.
- Parent cancels a started task and child dashboard hides it.
- Child completes a reading task with note, difficulty, minutes, and book name.
- Parent sees completion details and confirms with a comment.
- Parent creates weekly recurring task and the task appears on a matching date.
- Pet panel shows XP progress, recent reward, and next unlock after rewards.

- [ ] **Step 2: Verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/App.test.tsx`

Expected: FAIL because UI controls do not exist.

- [ ] **Step 3: Implement UI controls**

Keep controls compact:
- Add recurrence selector: `只今天`, `每天`, `每周几天`.
- Add weekday toggle buttons for weekly recurrence.
- Add inline edit mode only for `not-started` tasks.
- Show delete for `not-started`, cancel/archive for tasks with activity/history.
- Add child completion detail panel before calling `markComplete`.
- Add parent comment input beside confirmation actions.
- Hide `canceled` and `archived` from child executable task lists.
- Show recurring template pause controls in parent dashboard.

- [ ] **Step 4: Update pet panel**

Render kitten level, energy, XP progress bar, streak, care items, recent reward, next unlock, and stage-specific kitten visuals already present in the app.

- [ ] **Step 5: Verify GREEN and commit**

Run: `TZ=Asia/Shanghai npm test -- src/App.test.tsx`

Expected: PASS.

Commit: `git add src/components/ParentDashboard.tsx src/components/ChildDashboard.tsx src/components/TaskCard.tsx src/components/PetPanel.tsx src/styles.css src/App.test.tsx && git commit -m "feat: add recurrence and completion detail ui"`

### Task 8: Full Verification And Test Scope Cleanup

**Files:**
- Modify: `vite.config.ts`
- Optional Modify: `e2e/study-companion.spec.ts`

- [ ] **Step 1: Exclude stale worktrees from Vitest**

Add:

```ts
test: {
  exclude: ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"]
}
```

while preserving the existing jsdom and setup settings.

- [ ] **Step 2: Add or update browser smoke coverage**

If `e2e/study-companion.spec.ts` exists, add a tablet smoke path for parent recurrence controls, child completion detail, and pet XP visibility.

- [ ] **Step 3: Run full verification**

Run:

```sh
npm run build
TZ=Asia/Shanghai npm test
```

If Playwright browsers are available, run:

```sh
npm run e2e
```

- [ ] **Step 4: Commit final verification cleanup**

Commit: `git add vite.config.ts e2e/study-companion.spec.ts && git commit -m "test: cover recurrence pet upgrade flows"`

## Self-Review

- Spec coverage: Tasks 1-2 cover versioned data and migration; Tasks 3 and 7 cover edit/delete/cancel/archive and completion details; Task 4 covers recurrence generation and pause; Task 5 covers XP, recent reward, and next unlock; Task 8 covers verification and stale worktree test isolation.
- Placeholder scan: Clean. Each task names exact files, tests, commands, and expected outcomes.
- Type consistency: The plan consistently uses `CompletionDetails`, `RecurringTaskTemplate`, `recurringTaskTemplates`, `parentComment`, `experience`, `experienceToNextLevel`, `recentReward`, and `nextUnlock`.
