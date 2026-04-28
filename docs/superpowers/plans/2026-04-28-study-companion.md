# Study Companion Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tablet-first parent-child study companion website with local data, task planning, focus timers, pet growth, parent confirmation, and review.

**Architecture:** Use a Vite React TypeScript single-page app with a small domain layer for app state transitions and rewards. Keep UI components thin: they call typed actions from a central app store, while domain modules own task status, focus session, daily review, and pet growth rules.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, Playwright, localStorage, CSS modules or plain CSS.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `index.html`: app shell.
- `src/main.tsx`: React entry point.
- `src/App.tsx`: top-level routing between home, child mode, parent mode, and focus view.
- `src/styles.css`: tablet-first visual system and responsive layout.
- `src/domain/types.ts`: shared app state, task, pet, session, and review types.
- `src/domain/defaultState.ts`: seed profile, settings, pet, tasks, and daily review.
- `src/domain/date.ts`: date key helpers.
- `src/domain/rewards.ts`: reward and streak calculations.
- `src/domain/tasks.ts`: task creation and task status transitions.
- `src/domain/focus.ts`: focus session start, recovery, completion, interruption, and rest state logic.
- `src/domain/review.ts`: daily review and communication suggestion generation.
- `src/storage/localStore.ts`: versioned localStorage load, save, export, clear, and recovery helpers.
- `src/state/useStudyStore.tsx`: React context/reducer wrapper around domain actions.
- `src/components/Home.tsx`: fake login mode selector.
- `src/components/ChildDashboard.tsx`: pet, today's tasks, and child actions.
- `src/components/FocusView.tsx`: countdown, quiet/lively modes, rest, completion, and stuck action.
- `src/components/ParentDashboard.tsx`: task creation, settings, confirmations, review, export, and clear data.
- `src/components/PetPanel.tsx`: pet mood, energy, level, streak, decorations.
- `src/components/TaskCard.tsx`: reusable task card.
- `src/components/ReviewPanel.tsx`: today and weekly review summary.
- `src/test/testState.ts`: reusable deterministic state builders.
- `src/domain/*.test.ts`: unit tests for domain behavior.
- `src/storage/localStore.test.ts`: storage tests.
- `src/App.test.tsx`: integration tests for major user flows.
- `e2e/study-companion.spec.ts`: Playwright tablet workflow and smoke checks.
- `playwright.config.ts`: Playwright config.
- `vite.config.ts`: Vite and Vitest config.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript configs.

## Implementation Tasks

### Task 1: Project Scaffold And Test Harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `playwright.config.ts`

- [ ] **Step 1: Create npm project metadata**

Create `package.json`:

```json
{
  "name": "study-companion",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "typescript": "^5.8.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^25.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create TypeScript and test configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "playwright.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["@testing-library/jest-dom/vitest"],
    globals: true
  }
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"] }
    }
  ]
});
```

- [ ] **Step 3: Create the minimal app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Study Companion</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="appShell">
      <section className="emptyState">
        <h1>学习伙伴</h1>
        <p>亲子共用的专注和习惯养成网站正在搭建中。</p>
      </section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  color: #263238;
  background: #f4f8f6;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input,
select,
textarea {
  font: inherit;
}

.appShell {
  min-height: 100vh;
  padding: 24px;
}

.emptyState {
  display: grid;
  min-height: calc(100vh - 48px);
  place-items: center;
  text-align: center;
}
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: npm installs dependencies and creates `package-lock.json`.

- [ ] **Step 5: Verify scaffold**

Run:

```bash
npm test
npm run build
```

Expected: `npm test` reports no test files or a clean pass, and `npm run build` creates a production build.

- [ ] **Step 6: Commit scaffold**

```bash
git add package.json package-lock.json index.html src/main.tsx src/App.tsx src/styles.css vite.config.ts tsconfig.json tsconfig.node.json playwright.config.ts
git commit -m "chore: scaffold study companion app"
```

### Task 2: Domain Types And Default State

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/date.ts`
- Create: `src/domain/defaultState.ts`
- Create: `src/test/testState.ts`
- Create: `src/domain/defaultState.test.ts`

- [ ] **Step 1: Write failing tests for default state**

Create `src/domain/defaultState.test.ts`:

```ts
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
  });

  it("uses stable date keys", () => {
    expect(todayKey(new Date("2026-04-28T23:59:59+08:00"))).toBe("2026-04-28");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/domain/defaultState.test.ts
```

Expected: FAIL because `defaultState`, `date`, and types are not defined.

- [ ] **Step 3: Add domain types**

Create `src/domain/types.ts`:

```ts
export type AppMode = "home" | "child" | "parent" | "focus";
export type TaskType = "homework" | "reading" | "handwriting" | "organization";
export type Subject = "chinese" | "math" | "english" | "other";
export type FocusPresentation = "quiet" | "lively";
export type TaskStatus =
  | "not-started"
  | "focusing"
  | "child-marked-complete"
  | "waiting-confirmation"
  | "completed"
  | "needs-adjustment";

export interface Profile {
  familyName: string;
  childName: string;
}

export interface Settings {
  focusMinutes: 10 | 15 | 20;
  restMinutes: 3 | 5 | 10;
  focusPresentation: FocusPresentation;
  dailyGoalFocusBlocks: number;
  dailyGoalTasks: number;
  dailyGoalHabits: number;
}

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  subject?: Subject;
  estimatedFocusBlocks: number;
  completionStandard: string;
  requiresConfirmation: boolean;
  status: TaskStatus;
  dateKey: string;
  actualReadingMinutes?: number;
  bookName?: string;
  completedAt?: string;
}

export interface FocusSession {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt?: string;
  plannedMinutes: number;
  completed: boolean;
  interruptions: number;
}

export interface PetState {
  level: number;
  energy: number;
  mood: "calm" | "happy" | "proud";
  careItems: number;
  unlockedDecorations: string[];
  streakDays: number;
}

export interface DailyReview {
  dateKey: string;
  completedTaskIds: string[];
  focusMinutes: number;
  restCount: number;
  pendingConfirmationIds: string[];
  communicationSuggestion: string;
  dailyGoalMet: boolean;
}

export interface StudyState {
  version: 1;
  mode: AppMode;
  todayKey: string;
  activeTaskId?: string;
  activeSessionId?: string;
  profile: Profile;
  settings: Settings;
  tasks: Record<string, Task>;
  focusSessions: Record<string, FocusSession>;
  pet: PetState;
  reviews: Record<string, DailyReview>;
}
```

- [ ] **Step 4: Add date and default state helpers**

Create `src/domain/date.ts`:

```ts
export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
```

Create `src/domain/defaultState.ts`:

```ts
import { todayKey } from "./date";
import type { DailyReview, StudyState } from "./types";

export function createEmptyReview(dateKey: string): DailyReview {
  return {
    dateKey,
    completedTaskIds: [],
    focusMinutes: 0,
    restCount: 0,
    pendingConfirmationIds: [],
    communicationSuggestion: "今天先关注孩子愿意开始的那一刻，及时肯定行动。",
    dailyGoalMet: false
  };
}

export function createDefaultState(now = new Date()): StudyState {
  const key = todayKey(now);

  return {
    version: 1,
    mode: "home",
    todayKey: key,
    profile: {
      familyName: "我的家庭",
      childName: "小朋友"
    },
    settings: {
      focusMinutes: 15,
      restMinutes: 5,
      focusPresentation: "quiet",
      dailyGoalFocusBlocks: 3,
      dailyGoalTasks: 2,
      dailyGoalHabits: 1
    },
    tasks: {},
    focusSessions: {},
    pet: {
      level: 1,
      energy: 0,
      mood: "calm",
      careItems: 0,
      unlockedDecorations: [],
      streakDays: 0
    },
    reviews: {
      [key]: createEmptyReview(key)
    }
  };
}
```

Create `src/test/testState.ts`:

```ts
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
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- src/domain/defaultState.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit domain foundation**

```bash
git add src/domain/types.ts src/domain/date.ts src/domain/defaultState.ts src/test/testState.ts src/domain/defaultState.test.ts
git commit -m "feat: add study state foundation"
```

### Task 3: Task Creation And Status Transitions

**Files:**
- Create: `src/domain/tasks.ts`
- Create: `src/domain/tasks.test.ts`

- [ ] **Step 1: Write failing task domain tests**

Create `src/domain/tasks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addTask, markTaskComplete, confirmTask, requestTaskAdjustment } from "./tasks";
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/domain/tasks.test.ts
```

Expected: FAIL because `tasks.ts` is not defined.

- [ ] **Step 3: Implement task transitions**

Create `src/domain/tasks.ts`:

```ts
import type { StudyState, Subject, Task, TaskType } from "./types";
import { grantTaskReward } from "./rewards";

export interface NewTaskInput {
  name: string;
  type: TaskType;
  subject?: Subject;
  estimatedFocusBlocks: number;
  completionStandard: string;
  requiresConfirmation: boolean;
  actualReadingMinutes?: number;
  bookName?: string;
}

function nextId(prefix: string, existing: Record<string, unknown>): string {
  return `${prefix}-${Object.keys(existing).length + 1}`;
}

export function addTask(state: StudyState, input: NewTaskInput): StudyState {
  const id = nextId("task", state.tasks);
  const task: Task = {
    id,
    name: input.name.trim(),
    type: input.type,
    subject: input.type === "homework" ? input.subject ?? "other" : undefined,
    estimatedFocusBlocks: input.estimatedFocusBlocks,
    completionStandard: input.completionStandard.trim(),
    requiresConfirmation: input.requiresConfirmation,
    status: "not-started",
    dateKey: state.todayKey,
    actualReadingMinutes: input.actualReadingMinutes,
    bookName: input.bookName?.trim() || undefined
  };

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [id]: task
    }
  };
}

export function markTaskComplete(state: StudyState, taskId: string, completedAt: string): StudyState {
  const task = state.tasks[taskId];
  if (!task || task.status === "completed" || task.status === "waiting-confirmation") {
    return state;
  }

  const nextTask: Task = {
    ...task,
    status: task.requiresConfirmation ? "waiting-confirmation" : "completed",
    completedAt
  };
  const review = state.reviews[task.dateKey];
  const nextState = {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: nextTask
    },
    reviews: {
      ...state.reviews,
      [task.dateKey]: {
        ...review,
        pendingConfirmationIds: task.requiresConfirmation
          ? Array.from(new Set([...review.pendingConfirmationIds, taskId]))
          : review.pendingConfirmationIds,
        completedTaskIds: task.requiresConfirmation
          ? review.completedTaskIds
          : Array.from(new Set([...review.completedTaskIds, taskId]))
      }
    }
  };

  return task.requiresConfirmation ? nextState : grantTaskReward(nextState, taskId);
}

export function confirmTask(state: StudyState, taskId: string): StudyState {
  const task = state.tasks[taskId];
  if (!task || task.status !== "waiting-confirmation") return state;

  const review = state.reviews[task.dateKey];
  const nextState = {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: "completed" as const
      }
    },
    reviews: {
      ...state.reviews,
      [task.dateKey]: {
        ...review,
        pendingConfirmationIds: review.pendingConfirmationIds.filter((id) => id !== taskId),
        completedTaskIds: Array.from(new Set([...review.completedTaskIds, taskId]))
      }
    }
  };

  return grantTaskReward(nextState, taskId);
}

export function requestTaskAdjustment(state: StudyState, taskId: string): StudyState {
  const task = state.tasks[taskId];
  if (!task) return state;
  const review = state.reviews[task.dateKey];

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: "needs-adjustment"
      }
    },
    reviews: {
      ...state.reviews,
      [task.dateKey]: {
        ...review,
        pendingConfirmationIds: review.pendingConfirmationIds.filter((id) => id !== taskId)
      }
    }
  };
}
```

- [ ] **Step 4: Add temporary reward stub**

Create `src/domain/rewards.ts`:

```ts
import type { StudyState } from "./types";

export function grantTaskReward(state: StudyState, _taskId: string): StudyState {
  return {
    ...state,
    pet: {
      ...state.pet,
      mood: "proud",
      careItems: state.pet.careItems + 1
    }
  };
}
```

- [ ] **Step 5: Run task tests**

Run:

```bash
npm test -- src/domain/tasks.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit task domain**

```bash
git add src/domain/tasks.ts src/domain/rewards.ts src/domain/tasks.test.ts
git commit -m "feat: add task status workflow"
```

### Task 4: Pet Rewards, Reviews, And Streaks

**Files:**
- Modify: `src/domain/rewards.ts`
- Create: `src/domain/rewards.test.ts`
- Create: `src/domain/review.ts`
- Create: `src/domain/review.test.ts`

- [ ] **Step 1: Write failing reward and review tests**

Create `src/domain/rewards.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { grantFocusReward, grantTaskReward, updateDailyGoalReward } from "./rewards";
import { testState, testTask } from "../test/testState";

describe("rewards", () => {
  it("adds 10 energy and happy mood for completed focus blocks", () => {
    const next = grantFocusReward(testState(), 15);

    expect(next.pet.energy).toBe(10);
    expect(next.pet.mood).toBe("happy");
    expect(next.reviews["2026-04-28"].focusMinutes).toBe(15);
  });

  it("adds care item for completed tasks", () => {
    const task = testTask({ status: "completed" });
    const state = testState({ tasks: { [task.id]: task } });
    const next = grantTaskReward(state, task.id);

    expect(next.pet.careItems).toBe(1);
    expect(next.reviews["2026-04-28"].completedTaskIds).toContain(task.id);
  });

  it("unlocks decorations at 3, 7, and 14 day streaks", () => {
    const state = testState({
      pet: { ...testState().pet, streakDays: 2 }
    });

    const next = updateDailyGoalReward(state, true);

    expect(next.pet.streakDays).toBe(3);
    expect(next.pet.unlockedDecorations).toContain("star-collar");
  });
});
```

Create `src/domain/review.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCommunicationSuggestion, refreshDailyReview } from "./review";
import { testState, testTask } from "../test/testState";

describe("review", () => {
  it("suggests praising the start when focus happened but few tasks completed", () => {
    expect(buildCommunicationSuggestion(15, 0, 0)).toContain("开始");
  });

  it("marks daily goal met when focus, task, and habit goals are reached", () => {
    const homework = testTask({ id: "task-1", type: "homework", status: "completed" });
    const habit = testTask({ id: "task-2", type: "reading", subject: undefined, status: "completed" });
    const state = testState({
      settings: { ...testState().settings, dailyGoalFocusBlocks: 1, dailyGoalTasks: 2, dailyGoalHabits: 1 },
      tasks: { [homework.id]: homework, [habit.id]: habit },
      reviews: {
        "2026-04-28": {
          ...testState().reviews["2026-04-28"],
          completedTaskIds: [homework.id, habit.id],
          focusMinutes: 15
        }
      }
    });

    const next = refreshDailyReview(state);
    expect(next.reviews["2026-04-28"].dailyGoalMet).toBe(true);
    expect(next.pet.streakDays).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/domain/rewards.test.ts src/domain/review.test.ts
```

Expected: FAIL because reward functions and review module are incomplete.

- [ ] **Step 3: Implement rewards**

Replace `src/domain/rewards.ts`:

```ts
import type { StudyState } from "./types";

const STREAK_UNLOCKS: Record<number, string> = {
  3: "star-collar",
  7: "rainbow-bed",
  14: "golden-badge"
};

export function grantFocusReward(state: StudyState, minutes: number): StudyState {
  const review = state.reviews[state.todayKey];

  return {
    ...state,
    pet: {
      ...state.pet,
      energy: state.pet.energy + 10,
      mood: "happy"
    },
    reviews: {
      ...state.reviews,
      [state.todayKey]: {
        ...review,
        focusMinutes: review.focusMinutes + minutes
      }
    }
  };
}

export function grantTaskReward(state: StudyState, taskId: string): StudyState {
  const task = state.tasks[taskId];
  if (!task) return state;
  const review = state.reviews[task.dateKey];

  return {
    ...state,
    pet: {
      ...state.pet,
      mood: "proud",
      careItems: state.pet.careItems + 1
    },
    reviews: {
      ...state.reviews,
      [task.dateKey]: {
        ...review,
        completedTaskIds: Array.from(new Set([...review.completedTaskIds, taskId]))
      }
    }
  };
}

export function updateDailyGoalReward(state: StudyState, goalMet: boolean): StudyState {
  const review = state.reviews[state.todayKey];
  if (!goalMet || review.dailyGoalMet) return state;

  const nextStreak = state.pet.streakDays + 1;
  const unlock = STREAK_UNLOCKS[nextStreak];

  return {
    ...state,
    pet: {
      ...state.pet,
      level: unlock ? state.pet.level + 1 : state.pet.level,
      streakDays: nextStreak,
      unlockedDecorations: unlock
        ? Array.from(new Set([...state.pet.unlockedDecorations, unlock]))
        : state.pet.unlockedDecorations
    },
    reviews: {
      ...state.reviews,
      [state.todayKey]: {
        ...review,
        dailyGoalMet: true
      }
    }
  };
}
```

- [ ] **Step 4: Implement daily review**

Create `src/domain/review.ts`:

```ts
import type { StudyState, Task } from "./types";
import { updateDailyGoalReward } from "./rewards";

function isHabit(task: Task): boolean {
  return task.type === "reading" || task.type === "handwriting" || task.type === "organization";
}

export function buildCommunicationSuggestion(focusMinutes: number, completedTasks: number, pendingCount: number): string {
  if (focusMinutes > 0 && completedTasks === 0) {
    return "今天可以先肯定孩子已经开始行动，再一起选一个最容易完成的小任务。";
  }
  if (pendingCount > 0) {
    return "有任务等你确认，先看孩子努力过的地方，再温和提出需要调整的一点。";
  }
  if (completedTasks >= 2) {
    return "今天适合表扬孩子坚持完成计划，也可以让孩子讲讲哪一段最顺利。";
  }
  return "今天先把目标放小，鼓励孩子完成一个短专注块就值得被看见。";
}

export function refreshDailyReview(state: StudyState): StudyState {
  const review = state.reviews[state.todayKey];
  const completedTasks = review.completedTaskIds.map((id) => state.tasks[id]).filter(Boolean);
  const completedHabitCount = completedTasks.filter(isHabit).length;
  const completedFocusBlocks = Math.floor(review.focusMinutes / state.settings.focusMinutes);
  const goalMet =
    completedFocusBlocks >= state.settings.dailyGoalFocusBlocks &&
    completedTasks.length >= state.settings.dailyGoalTasks &&
    completedHabitCount >= state.settings.dailyGoalHabits;

  const withSuggestion: StudyState = {
    ...state,
    reviews: {
      ...state.reviews,
      [state.todayKey]: {
        ...review,
        communicationSuggestion: buildCommunicationSuggestion(
          review.focusMinutes,
          completedTasks.length,
          review.pendingConfirmationIds.length
        )
      }
    }
  };

  return updateDailyGoalReward(withSuggestion, goalMet);
}
```

- [ ] **Step 5: Run domain tests**

Run:

```bash
npm test -- src/domain/rewards.test.ts src/domain/review.test.ts src/domain/tasks.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit rewards and review**

```bash
git add src/domain/rewards.ts src/domain/rewards.test.ts src/domain/review.ts src/domain/review.test.ts src/domain/tasks.ts
git commit -m "feat: add pet rewards and daily review"
```

### Task 5: Focus Sessions And Timer Recovery

**Files:**
- Create: `src/domain/focus.ts`
- Create: `src/domain/focus.test.ts`

- [ ] **Step 1: Write failing focus tests**

Create `src/domain/focus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { completeFocusSession, getRemainingSeconds, startFocusSession, recordInterruption } from "./focus";
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

    expect(completed.pet.energy).toBe(10);
    expect(completed.reviews["2026-04-28"].focusMinutes).toBe(15);
    expect(completed.activeSessionId).toBeUndefined();
  });

  it("records interruptions without granting rewards", () => {
    const task = testTask();
    const started = startFocusSession(testState({ tasks: { [task.id]: task } }), task.id, "2026-04-28T08:00:00+08:00");
    const interrupted = recordInterruption(started);
    const session = Object.values(interrupted.focusSessions)[0];

    expect(session.interruptions).toBe(1);
    expect(interrupted.pet.energy).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/domain/focus.test.ts
```

Expected: FAIL because `focus.ts` is not defined.

- [ ] **Step 3: Implement focus logic**

Create `src/domain/focus.ts`:

```ts
import { grantFocusReward } from "./rewards";
import type { FocusSession, StudyState } from "./types";

function nextSessionId(existing: Record<string, FocusSession>): string {
  return `session-${Object.keys(existing).length + 1}`;
}

export function startFocusSession(state: StudyState, taskId: string, startedAt: string): StudyState {
  const task = state.tasks[taskId];
  if (!task) return state;

  const id = nextSessionId(state.focusSessions);
  const session: FocusSession = {
    id,
    taskId,
    startedAt,
    plannedMinutes: state.settings.focusMinutes,
    completed: false,
    interruptions: 0
  };

  return {
    ...state,
    mode: "focus",
    activeTaskId: taskId,
    activeSessionId: id,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: "focusing"
      }
    },
    focusSessions: {
      ...state.focusSessions,
      [id]: session
    }
  };
}

export function getRemainingSeconds(startedAt: string, plannedMinutes: number, now = new Date()): number {
  const elapsedMs = now.getTime() - new Date(startedAt).getTime();
  const plannedMs = plannedMinutes * 60 * 1000;
  return Math.max(0, Math.ceil((plannedMs - elapsedMs) / 1000));
}

export function completeFocusSession(state: StudyState, endedAt: string): StudyState {
  if (!state.activeSessionId) return state;
  const session = state.focusSessions[state.activeSessionId];
  if (!session || session.completed) return state;

  const task = state.tasks[session.taskId];
  const completedSession = {
    ...session,
    endedAt,
    completed: true
  };
  const next = {
    ...state,
    mode: "child" as const,
    activeSessionId: undefined,
    focusSessions: {
      ...state.focusSessions,
      [session.id]: completedSession
    },
    tasks: task
      ? {
          ...state.tasks,
          [task.id]: {
            ...task,
            status: "not-started" as const
          }
        }
      : state.tasks
  };

  return grantFocusReward(next, session.plannedMinutes);
}

export function recordInterruption(state: StudyState): StudyState {
  if (!state.activeSessionId) return state;
  const session = state.focusSessions[state.activeSessionId];
  if (!session) return state;

  return {
    ...state,
    focusSessions: {
      ...state.focusSessions,
      [session.id]: {
        ...session,
        interruptions: session.interruptions + 1
      }
    }
  };
}
```

- [ ] **Step 4: Run focus tests**

Run:

```bash
npm test -- src/domain/focus.test.ts src/domain/rewards.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit focus domain**

```bash
git add src/domain/focus.ts src/domain/focus.test.ts
git commit -m "feat: add focus session logic"
```

### Task 6: Versioned Local Storage

**Files:**
- Create: `src/storage/localStore.ts`
- Create: `src/storage/localStore.test.ts`

- [ ] **Step 1: Write failing storage tests**

Create `src/storage/localStore.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/storage/localStore.test.ts
```

Expected: FAIL because `localStore.ts` is not defined.

- [ ] **Step 3: Implement storage helpers**

Create `src/storage/localStore.ts`:

```ts
import { createDefaultState } from "../domain/defaultState";
import type { StudyState } from "../domain/types";

export const STORAGE_KEY = "study-companion-state";

function isStudyState(value: unknown): value is StudyState {
  return Boolean(
    value &&
      typeof value === "object" &&
      "version" in value &&
      (value as { version: unknown }).version === 1 &&
      "profile" in value &&
      "tasks" in value &&
      "pet" in value
  );
}

export function loadStudyState(): StudyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return isStudyState(parsed) ? parsed : createDefaultState();
  } catch {
    return createDefaultState();
  }
}

export function saveStudyState(state: StudyState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportStudyState(): string {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.stringify(JSON.parse(raw), null, 2) : JSON.stringify(createDefaultState(), null, 2);
}

export function clearStudyState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 4: Run storage tests**

Run:

```bash
npm test -- src/storage/localStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit storage**

```bash
git add src/storage/localStore.ts src/storage/localStore.test.ts
git commit -m "feat: add local study state storage"
```

### Task 7: React State Provider

**Files:**
- Create: `src/state/useStudyStore.tsx`
- Create: `src/state/useStudyStore.test.tsx`

- [ ] **Step 1: Write failing store integration test**

Create `src/state/useStudyStore.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StudyProvider, useStudyStore } from "./useStudyStore";

function Probe() {
  const { state, actions } = useStudyStore();
  return (
    <div>
      <p>{state.mode}</p>
      <p>{Object.keys(state.tasks).length}</p>
      <button onClick={() => actions.setMode("parent")}>家长</button>
      <button
        onClick={() =>
          actions.addTask({
            name: "阅读",
            type: "reading",
            estimatedFocusBlocks: 1,
            completionStandard: "读 15 分钟",
            requiresConfirmation: false
          })
        }
      >
        加任务
      </button>
    </div>
  );
}

describe("StudyProvider", () => {
  it("exposes state and actions", async () => {
    const user = userEvent.setup();
    render(
      <StudyProvider>
        <Probe />
      </StudyProvider>
    );

    await user.click(screen.getByRole("button", { name: "家长" }));
    expect(screen.getByText("parent")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "加任务" }));
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/state/useStudyStore.test.tsx
```

Expected: FAIL because provider is not defined.

- [ ] **Step 3: Implement provider and actions**

Create `src/state/useStudyStore.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createDefaultState } from "../domain/defaultState";
import { completeFocusSession, recordInterruption, startFocusSession } from "../domain/focus";
import { refreshDailyReview } from "../domain/review";
import { addTask, confirmTask, markTaskComplete, requestTaskAdjustment, type NewTaskInput } from "../domain/tasks";
import type { AppMode, Settings, StudyState } from "../domain/types";
import { clearStudyState, loadStudyState, saveStudyState } from "../storage/localStore";

interface StudyActions {
  setMode(mode: AppMode): void;
  addTask(input: NewTaskInput): void;
  updateSettings(settings: Partial<Settings>): void;
  startFocus(taskId: string): void;
  completeFocus(): void;
  interruptFocus(): void;
  markComplete(taskId: string): void;
  confirm(taskId: string): void;
  adjust(taskId: string): void;
  resetData(): void;
}

interface StudyStore {
  state: StudyState;
  actions: StudyActions;
}

const StudyContext = createContext<StudyStore | null>(null);

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudyState>(() => loadStudyState());

  useEffect(() => {
    saveStudyState(state);
  }, [state]);

  const actions = useMemo<StudyActions>(
    () => ({
      setMode(mode) {
        setState((current) => ({ ...current, mode }));
      },
      addTask(input) {
        setState((current) => addTask(current, input));
      },
      updateSettings(settings) {
        setState((current) => ({
          ...current,
          settings: { ...current.settings, ...settings }
        }));
      },
      startFocus(taskId) {
        setState((current) => startFocusSession(current, taskId, new Date().toISOString()));
      },
      completeFocus() {
        setState((current) => refreshDailyReview(completeFocusSession(current, new Date().toISOString())));
      },
      interruptFocus() {
        setState((current) => recordInterruption(current));
      },
      markComplete(taskId) {
        setState((current) => refreshDailyReview(markTaskComplete(current, taskId, new Date().toISOString())));
      },
      confirm(taskId) {
        setState((current) => refreshDailyReview(confirmTask(current, taskId)));
      },
      adjust(taskId) {
        setState((current) => requestTaskAdjustment(current, taskId));
      },
      resetData() {
        clearStudyState();
        setState(createDefaultState());
      }
    }),
    []
  );

  return <StudyContext.Provider value={{ state, actions }}>{children}</StudyContext.Provider>;
}

export function useStudyStore(): StudyStore {
  const value = useContext(StudyContext);
  if (!value) throw new Error("useStudyStore must be used inside StudyProvider");
  return value;
}
```

- [ ] **Step 4: Run provider test**

Run:

```bash
npm test -- src/state/useStudyStore.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit provider**

```bash
git add src/state/useStudyStore.tsx src/state/useStudyStore.test.tsx
git commit -m "feat: add study state provider"
```

### Task 8: Home, Pet, And Task Components

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Create: `src/components/Home.tsx`
- Create: `src/components/PetPanel.tsx`
- Create: `src/components/TaskCard.tsx`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Write failing UI smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { StudyProvider } from "./state/useStudyStore";

function renderApp() {
  return render(
    <StudyProvider>
      <App />
    </StudyProvider>
  );
}

describe("App shell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("lets users enter child and parent modes", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "孩子模式" }));
    expect(screen.getByText("今日任务")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "回到首页" }));
    await user.click(screen.getByRole("button", { name: "家长模式" }));
    expect(screen.getByText("今日计划")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because the UI components are not implemented.

- [ ] **Step 3: Add reusable home and display components**

Create `src/components/Home.tsx`:

```tsx
import { Baby, ClipboardList } from "lucide-react";

interface HomeProps {
  childName: string;
  onChild(): void;
  onParent(): void;
}

export function Home({ childName, onChild, onParent }: HomeProps) {
  return (
    <section className="homeScreen">
      <div>
        <p className="eyebrow">学习伙伴</p>
        <h1>{childName}，今天和伙伴一起开始吧</h1>
      </div>
      <div className="modeGrid">
        <button className="modeButton childMode" onClick={onChild}>
          <Baby aria-hidden="true" />
          <span>孩子模式</span>
        </button>
        <button className="modeButton parentMode" onClick={onParent}>
          <ClipboardList aria-hidden="true" />
          <span>家长模式</span>
        </button>
      </div>
    </section>
  );
}
```

Create `src/components/PetPanel.tsx`:

```tsx
import type { PetState } from "../domain/types";

export function PetPanel({ pet }: { pet: PetState }) {
  return (
    <section className={`petPanel mood-${pet.mood}`} aria-label="宠物伙伴">
      <div className="petAvatar" aria-hidden="true">
        <span className="petFace">•ᴗ•</span>
      </div>
      <div>
        <h2>伙伴等级 {pet.level}</h2>
        <p>能量 {pet.energy} · 连续 {pet.streakDays} 天 · 照顾道具 {pet.careItems}</p>
      </div>
    </section>
  );
}
```

Create `src/components/TaskCard.tsx`:

```tsx
import { Play, CheckCircle2 } from "lucide-react";
import type { Task } from "../domain/types";

const TYPE_LABELS: Record<Task["type"], string> = {
  homework: "作业",
  reading: "阅读",
  handwriting: "练字",
  organization: "整理"
};

const STATUS_LABELS: Record<Task["status"], string> = {
  "not-started": "待开始",
  focusing: "专注中",
  "child-marked-complete": "已标记",
  "waiting-confirmation": "待确认",
  completed: "已完成",
  "needs-adjustment": "再调整"
};

interface TaskCardProps {
  task: Task;
  onStart?: () => void;
  onComplete?: () => void;
}

export function TaskCard({ task, onStart, onComplete }: TaskCardProps) {
  return (
    <article className="taskCard">
      <div>
        <p className="taskMeta">
          {TYPE_LABELS[task.type]} · {task.estimatedFocusBlocks} 个专注块
        </p>
        <h3>{task.name}</h3>
        <p>{task.completionStandard}</p>
        <span className="statusPill">{STATUS_LABELS[task.status]}</span>
      </div>
      <div className="taskActions">
        {onStart && task.status !== "completed" && (
          <button className="iconButton" aria-label={`开始 ${task.name}`} onClick={onStart}>
            <Play aria-hidden="true" />
          </button>
        )}
        {onComplete && task.status !== "completed" && task.status !== "waiting-confirmation" && (
          <button className="iconButton" aria-label={`完成 ${task.name}`} onClick={onComplete}>
            <CheckCircle2 aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Wire provider and route placeholders**

Modify `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { StudyProvider } from "./state/useStudyStore";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StudyProvider>
      <App />
    </StudyProvider>
  </React.StrictMode>
);
```

Replace `src/App.tsx`:

```tsx
import { Home } from "./components/Home";
import { PetPanel } from "./components/PetPanel";
import { useStudyStore } from "./state/useStudyStore";

function Header({ title }: { title: string }) {
  const { actions } = useStudyStore();
  return (
    <header className="topBar">
      <h1>{title}</h1>
      <button onClick={() => actions.setMode("home")}>回到首页</button>
    </header>
  );
}

function ChildPlaceholder() {
  const { state } = useStudyStore();
  return (
    <main className="appShell">
      <Header title="孩子模式" />
      <PetPanel pet={state.pet} />
      <h2>今日任务</h2>
    </main>
  );
}

function ParentPlaceholder() {
  return (
    <main className="appShell">
      <Header title="家长模式" />
      <h2>今日计划</h2>
    </main>
  );
}

export function App() {
  const { state, actions } = useStudyStore();

  if (state.mode === "child") return <ChildPlaceholder />;
  if (state.mode === "parent") return <ParentPlaceholder />;

  return (
    <main className="appShell">
      <Home childName={state.profile.childName} onChild={() => actions.setMode("child")} onParent={() => actions.setMode("parent")} />
    </main>
  );
}
```

- [ ] **Step 5: Add tablet-first CSS foundation**

Append to `src/styles.css`:

```css
.homeScreen {
  display: grid;
  gap: 32px;
  align-content: center;
  min-height: calc(100vh - 48px);
  max-width: 980px;
  margin: 0 auto;
}

.eyebrow,
.taskMeta {
  color: #3f7c6b;
  font-weight: 700;
}

.homeScreen h1,
.topBar h1 {
  margin: 0;
  font-size: 2.4rem;
  letter-spacing: 0;
}

.modeGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 20px;
}

.modeButton,
.taskCard,
.petPanel {
  border: 1px solid #d6e5de;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(38, 50, 56, 0.08);
}

.modeButton {
  display: grid;
  gap: 16px;
  place-items: center;
  min-height: 180px;
  padding: 24px;
  color: #263238;
  font-size: 1.4rem;
  font-weight: 800;
}

.modeButton svg,
.iconButton svg {
  width: 32px;
  height: 32px;
}

.topBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.topBar button,
.primaryButton,
.secondaryButton,
.iconButton {
  min-height: 48px;
  border: 0;
  border-radius: 8px;
  background: #226b5f;
  color: #fff;
  font-weight: 800;
  padding: 0 18px;
}

.petPanel {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  margin-bottom: 24px;
}

.petAvatar {
  display: grid;
  width: 112px;
  height: 112px;
  place-items: center;
  border-radius: 50%;
  background: #f8d77b;
}

.petFace {
  font-size: 2rem;
}

.taskCard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
}

.taskCard h3,
.taskCard p {
  margin: 0 0 8px;
}

.statusPill {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  background: #e5f1ed;
  color: #226b5f;
  font-weight: 700;
}

.taskActions {
  display: flex;
  gap: 10px;
}

.iconButton {
  display: grid;
  width: 56px;
  min-width: 56px;
  place-items: center;
  padding: 0;
}

@media (max-width: 720px) {
  .appShell {
    padding: 16px;
  }

  .modeGrid {
    grid-template-columns: 1fr;
  }

  .topBar,
  .taskCard,
  .petPanel {
    align-items: stretch;
    flex-direction: column;
  }
}
```

- [ ] **Step 6: Run UI test**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit shell UI**

```bash
git add src/App.tsx src/main.tsx src/styles.css src/components/Home.tsx src/components/PetPanel.tsx src/components/TaskCard.tsx src/App.test.tsx
git commit -m "feat: add mode selection shell"
```

### Task 9: Child Dashboard And Focus View

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/ChildDashboard.tsx`
- Create: `src/components/FocusView.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add failing child flow test**

Append to `src/App.test.tsx`:

```tsx
it("lets a child start focus, use stuck help, and complete a task", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "家长模式" }));
  await user.type(screen.getByLabelText("任务名称"), "语文练习");
  await user.click(screen.getByRole("button", { name: "添加任务" }));
  await user.click(screen.getByRole("button", { name: "回到首页" }));
  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "开始 语文练习" }));

  expect(screen.getByText("专注中")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "我卡住了" }));
  expect(screen.getByText("先做 5 分钟")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "完成本轮专注" }));
  expect(screen.getByText("今日任务")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because child dashboard, parent task form, and focus view are missing.

- [ ] **Step 3: Implement child dashboard**

Create `src/components/ChildDashboard.tsx`:

```tsx
import { PetPanel } from "./PetPanel";
import { TaskCard } from "./TaskCard";
import { useStudyStore } from "../state/useStudyStore";

export function ChildDashboard() {
  const { state, actions } = useStudyStore();
  const todayTasks = Object.values(state.tasks).filter((task) => task.dateKey === state.todayKey);

  return (
    <section className="screenGrid">
      <PetPanel pet={state.pet} />
      <div className="sectionHeader">
        <h2>今日任务</h2>
        <p>选一个任务，先开始一个短短的专注块。</p>
      </div>
      <div className="taskList">
        {todayTasks.length === 0 ? (
          <p className="emptyHint">今天还没有任务，请家长先添加。</p>
        ) : (
          todayTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={() => actions.startFocus(task.id)}
              onComplete={() => actions.markComplete(task.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement focus view**

Create `src/components/FocusView.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { getRemainingSeconds } from "../domain/focus";
import { useStudyStore } from "../state/useStudyStore";
import { PetPanel } from "./PetPanel";

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function FocusView() {
  const { state, actions } = useStudyStore();
  const session = state.activeSessionId ? state.focusSessions[state.activeSessionId] : undefined;
  const task = session ? state.tasks[session.taskId] : undefined;
  const [showStuck, setShowStuck] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = useMemo(
    () => (session ? getRemainingSeconds(session.startedAt, session.plannedMinutes, now) : 0),
    [now, session]
  );

  if (!session || !task) {
    return (
      <section className="screenGrid">
        <p>没有正在进行的专注。</p>
        <button onClick={() => actions.setMode("child")}>回到今日任务</button>
      </section>
    );
  }

  return (
    <section className={`focusScreen ${state.settings.focusPresentation}`}>
      <PetPanel pet={state.pet} />
      <p className="eyebrow">专注中</p>
      <h2>{task.name}</h2>
      <div className="timerDisplay" aria-label="剩余时间">
        {formatSeconds(remaining)}
      </div>
      {state.settings.focusPresentation === "lively" && <p className="encouragement">伙伴在旁边陪你，一次只做这一件事。</p>}
      <div className="focusActions">
        <button className="secondaryButton" onClick={() => setShowStuck(true)}>
          我卡住了
        </button>
        <button className="primaryButton" onClick={actions.completeFocus}>
          完成本轮专注
        </button>
      </div>
      {showStuck && (
        <div className="stuckPanel">
          <button onClick={() => setShowStuck(false)}>先做 5 分钟</button>
          <button onClick={() => actions.setMode("child")}>换一个任务</button>
          <button onClick={actions.interruptFocus}>请家长帮我看一下</button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Wire child and focus routes**

Modify `src/App.tsx` to use `ChildDashboard` and `FocusView` while keeping `ParentPlaceholder` until Task 10:

```tsx
import { ChildDashboard } from "./components/ChildDashboard";
import { FocusView } from "./components/FocusView";
import { Home } from "./components/Home";
import { useStudyStore } from "./state/useStudyStore";

function Header({ title }: { title: string }) {
  const { actions } = useStudyStore();
  return (
    <header className="topBar">
      <h1>{title}</h1>
      <button onClick={() => actions.setMode("home")}>回到首页</button>
    </header>
  );
}

function ParentPlaceholder() {
  const { actions } = useStudyStore();
  return (
    <main className="appShell">
      <Header title="家长模式" />
      <h2>今日计划</h2>
      <label>
        任务名称
        <input aria-label="任务名称" />
      </label>
      <button onClick={() => actions.addTask({
        name: "语文练习",
        type: "homework",
        subject: "chinese",
        estimatedFocusBlocks: 1,
        completionStandard: "完成并检查一遍",
        requiresConfirmation: true
      })}>
        添加任务
      </button>
    </main>
  );
}

export function App() {
  const { state, actions } = useStudyStore();

  if (state.mode === "focus") {
    return (
      <main className="appShell">
        <FocusView />
      </main>
    );
  }

  if (state.mode === "child") {
    return (
      <main className="appShell">
        <Header title="孩子模式" />
        <ChildDashboard />
      </main>
    );
  }

  if (state.mode === "parent") return <ParentPlaceholder />;

  return (
    <main className="appShell">
      <Home childName={state.profile.childName} onChild={() => actions.setMode("child")} onParent={() => actions.setMode("parent")} />
    </main>
  );
}
```

- [ ] **Step 6: Add focus styles**

Append to `src/styles.css`:

```css
.screenGrid,
.focusScreen {
  display: grid;
  gap: 18px;
  max-width: 980px;
  margin: 0 auto;
}

.sectionHeader h2,
.sectionHeader p {
  margin: 0 0 8px;
}

.taskList {
  display: grid;
  gap: 14px;
}

.emptyHint {
  padding: 24px;
  border: 1px dashed #b7cfc5;
  border-radius: 8px;
  background: #fff;
}

.timerDisplay {
  display: grid;
  min-height: 220px;
  place-items: center;
  border-radius: 8px;
  background: #fff;
  color: #1f5b52;
  font-size: 5rem;
  font-weight: 900;
  letter-spacing: 0;
}

.focusActions,
.stuckPanel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.secondaryButton {
  background: #6f7f7a;
}

.stuckPanel {
  padding: 16px;
  border: 1px solid #d6e5de;
  border-radius: 8px;
  background: #fff;
}

.stuckPanel button {
  min-height: 44px;
  border: 1px solid #c9ddd4;
  border-radius: 8px;
  background: #f4f8f6;
  padding: 0 14px;
  color: #263238;
  font-weight: 700;
}
```

- [ ] **Step 7: Run app tests**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit child flow**

```bash
git add src/App.tsx src/components/ChildDashboard.tsx src/components/FocusView.tsx src/styles.css src/App.test.tsx
git commit -m "feat: add child focus workflow"
```

### Task 10: Parent Dashboard, Settings, Confirmation, And Data Tools

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/ParentDashboard.tsx`
- Create: `src/components/ReviewPanel.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add failing parent flow test**

Append to `src/App.test.tsx`:

```tsx
it("lets parents configure tasks, confirm completion, and reset data", async () => {
  const user = userEvent.setup();
  renderApp();

  await user.click(screen.getByRole("button", { name: "家长模式" }));
  await user.clear(screen.getByLabelText("任务名称"));
  await user.type(screen.getByLabelText("任务名称"), "阅读");
  await user.selectOptions(screen.getByLabelText("任务类型"), "reading");
  await user.click(screen.getByLabelText("不需要家长确认"));
  await user.click(screen.getByRole("button", { name: "添加任务" }));
  expect(screen.getByText("阅读")).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("专注时长"), "10");
  expect(screen.getByText("10 分钟")).toBeInTheDocument();

  expect(screen.getByRole("button", { name: "导出数据" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "清空数据" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because parent dashboard is incomplete.

- [ ] **Step 3: Implement review panel**

Create `src/components/ReviewPanel.tsx`:

```tsx
import type { DailyReview } from "../domain/types";

export function ReviewPanel({ review }: { review: DailyReview }) {
  return (
    <section className="reviewPanel">
      <h2>今日复盘</h2>
      <div className="reviewGrid">
        <div>
          <strong>{review.completedTaskIds.length}</strong>
          <span>完成任务</span>
        </div>
        <div>
          <strong>{review.focusMinutes}</strong>
          <span>专注分钟</span>
        </div>
        <div>
          <strong>{review.restCount}</strong>
          <span>休息次数</span>
        </div>
        <div>
          <strong>{review.pendingConfirmationIds.length}</strong>
          <span>待确认</span>
        </div>
      </div>
      <p className="suggestion">{review.communicationSuggestion}</p>
    </section>
  );
}
```

- [ ] **Step 4: Implement parent dashboard**

Create `src/components/ParentDashboard.tsx`:

```tsx
import { useState } from "react";
import { exportStudyState } from "../storage/localStore";
import { useStudyStore } from "../state/useStudyStore";
import type { FocusPresentation, TaskType } from "../domain/types";
import { TaskCard } from "./TaskCard";
import { ReviewPanel } from "./ReviewPanel";

export function ParentDashboard() {
  const { state, actions } = useStudyStore();
  const [name, setName] = useState("语文练习");
  const [type, setType] = useState<TaskType>("homework");
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const todayTasks = Object.values(state.tasks).filter((task) => task.dateKey === state.todayKey);
  const review = state.reviews[state.todayKey];

  return (
    <section className="parentGrid">
      <section className="panel">
        <h2>今日计划</h2>
        <label>
          任务名称
          <input aria-label="任务名称" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          任务类型
          <select aria-label="任务类型" value={type} onChange={(event) => setType(event.target.value as TaskType)}>
            <option value="homework">作业</option>
            <option value="reading">阅读</option>
            <option value="handwriting">练字</option>
            <option value="organization">整理</option>
          </select>
        </label>
        <label>
          <input
            aria-label="不需要家长确认"
            type="checkbox"
            checked={!requiresConfirmation}
            onChange={(event) => setRequiresConfirmation(!event.target.checked)}
          />
          不需要家长确认
        </label>
        <button
          className="primaryButton"
          onClick={() =>
            actions.addTask({
              name,
              type,
              subject: type === "homework" ? "chinese" : undefined,
              estimatedFocusBlocks: 1,
              completionStandard: type === "reading" ? "读 15 分钟" : "完成后检查一遍",
              requiresConfirmation
            })
          }
        >
          添加任务
        </button>
      </section>

      <section className="panel">
        <h2>规则设置</h2>
        <label>
          专注时长
          <select
            aria-label="专注时长"
            value={state.settings.focusMinutes}
            onChange={(event) => actions.updateSettings({ focusMinutes: Number(event.target.value) as 10 | 15 | 20 })}
          >
            <option value="10">10 分钟</option>
            <option value="15">15 分钟</option>
            <option value="20">20 分钟</option>
          </select>
        </label>
        <p>{state.settings.focusMinutes} 分钟</p>
        <label>
          专注页模式
          <select
            aria-label="专注页模式"
            value={state.settings.focusPresentation}
            onChange={(event) => actions.updateSettings({ focusPresentation: event.target.value as FocusPresentation })}
          >
            <option value="quiet">安静模式</option>
            <option value="lively">活泼模式</option>
          </select>
        </label>
      </section>

      <section className="panel widePanel">
        <h2>任务确认</h2>
        <div className="taskList">
          {todayTasks.map((task) => (
            <div key={task.id} className="confirmationRow">
              <TaskCard task={task} />
              {task.status === "waiting-confirmation" && (
                <div className="taskActions">
                  <button className="primaryButton" onClick={() => actions.confirm(task.id)}>确认</button>
                  <button className="secondaryButton" onClick={() => actions.adjust(task.id)}>再调整</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <ReviewPanel review={review} />

      <section className="panel">
        <h2>数据</h2>
        <button className="secondaryButton" onClick={() => window.alert(exportStudyState())}>导出数据</button>
        <button className="secondaryButton" onClick={actions.resetData}>清空数据</button>
      </section>
    </section>
  );
}
```

- [ ] **Step 5: Wire parent dashboard**

Replace `ParentPlaceholder` in `src/App.tsx` with `ParentDashboard` import and route:

```tsx
import { ChildDashboard } from "./components/ChildDashboard";
import { FocusView } from "./components/FocusView";
import { Home } from "./components/Home";
import { ParentDashboard } from "./components/ParentDashboard";
import { useStudyStore } from "./state/useStudyStore";

function Header({ title }: { title: string }) {
  const { actions } = useStudyStore();
  return (
    <header className="topBar">
      <h1>{title}</h1>
      <button onClick={() => actions.setMode("home")}>回到首页</button>
    </header>
  );
}

export function App() {
  const { state, actions } = useStudyStore();

  if (state.mode === "focus") {
    return (
      <main className="appShell">
        <FocusView />
      </main>
    );
  }

  if (state.mode === "child") {
    return (
      <main className="appShell">
        <Header title="孩子模式" />
        <ChildDashboard />
      </main>
    );
  }

  if (state.mode === "parent") {
    return (
      <main className="appShell">
        <Header title="家长模式" />
        <ParentDashboard />
      </main>
    );
  }

  return (
    <main className="appShell">
      <Home childName={state.profile.childName} onChild={() => actions.setMode("child")} onParent={() => actions.setMode("parent")} />
    </main>
  );
}
```

- [ ] **Step 6: Add parent styles**

Append to `src/styles.css`:

```css
.parentGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: 18px;
  max-width: 1120px;
  margin: 0 auto;
}

.panel,
.reviewPanel {
  display: grid;
  gap: 14px;
  align-content: start;
  border: 1px solid #d6e5de;
  border-radius: 8px;
  background: #fff;
  padding: 18px;
}

.widePanel {
  grid-column: 1 / -1;
}

label {
  display: grid;
  gap: 8px;
  font-weight: 700;
}

input,
select {
  min-height: 44px;
  border: 1px solid #bdd5cc;
  border-radius: 8px;
  padding: 0 12px;
}

.confirmationRow {
  display: grid;
  gap: 10px;
}

.reviewGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.reviewGrid div {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 8px;
  background: #f4f8f6;
}

.reviewGrid strong {
  font-size: 1.8rem;
  color: #226b5f;
}

.suggestion {
  margin: 0;
  padding: 14px;
  border-radius: 8px;
  background: #fff7d8;
}

@media (max-width: 820px) {
  .parentGrid,
  .reviewGrid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: Run UI tests**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit parent dashboard**

```bash
git add src/App.tsx src/components/ParentDashboard.tsx src/components/ReviewPanel.tsx src/styles.css src/App.test.tsx
git commit -m "feat: add parent planning dashboard"
```

### Task 11: Cross-Day Review And Data Recovery UX

**Files:**
- Create: `src/domain/dayRollover.ts`
- Create: `src/domain/dayRollover.test.ts`
- Modify: `src/state/useStudyStore.tsx`
- Modify: `src/components/ParentDashboard.tsx`

- [ ] **Step 1: Write failing rollover tests**

Create `src/domain/dayRollover.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { rolloverToDate, copyUnfinishedTasksToToday } from "./dayRollover";
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/domain/dayRollover.test.ts
```

Expected: FAIL because `dayRollover.ts` is not defined.

- [ ] **Step 3: Implement rollover helpers**

Create `src/domain/dayRollover.ts`:

```ts
import { createEmptyReview } from "./defaultState";
import { todayKey } from "./date";
import type { StudyState, Task } from "./types";

export function rolloverToDate(state: StudyState, date: Date): StudyState {
  const key = todayKey(date);
  if (key === state.todayKey) return state;

  return {
    ...state,
    todayKey: key,
    activeTaskId: undefined,
    activeSessionId: undefined,
    mode: "home",
    reviews: {
      ...state.reviews,
      [key]: state.reviews[key] ?? createEmptyReview(key)
    }
  };
}

export function copyUnfinishedTasksToToday(state: StudyState, fromDateKey: string): StudyState {
  const unfinished = Object.values(state.tasks).filter(
    (task) => task.dateKey === fromDateKey && task.status !== "completed"
  );
  const copiedTasks = unfinished.reduce<Record<string, Task>>((acc, task, index) => {
    const id = `task-${Object.keys(state.tasks).length + index + 1}`;
    acc[id] = {
      ...task,
      id,
      dateKey: state.todayKey,
      status: "not-started",
      completedAt: undefined
    };
    return acc;
  }, {});

  return {
    ...state,
    tasks: {
      ...state.tasks,
      ...copiedTasks
    }
  };
}
```

- [ ] **Step 4: Wire rollover into provider**

Modify imports and initial state in `src/state/useStudyStore.tsx`:

```tsx
import { createDefaultState } from "../domain/defaultState";
import { rolloverToDate } from "../domain/dayRollover";
```

Replace the provider state initializer:

```tsx
const [state, setState] = useState<StudyState>(() => rolloverToDate(loadStudyState(), new Date()));
```

- [ ] **Step 5: Add copy unfinished action**

Add to `StudyActions`:

```ts
copyUnfinished(fromDateKey: string): void;
```

Add to the actions object:

```ts
copyUnfinished(fromDateKey) {
  setState((current) => copyUnfinishedTasksToToday(current, fromDateKey));
}
```

Add import:

```ts
import { copyUnfinishedTasksToToday, rolloverToDate } from "../domain/dayRollover";
```

- [ ] **Step 6: Show copy action in parent dashboard**

In `ParentDashboard`, compute yesterday keys:

```tsx
const previousDateKeys = Object.keys(state.reviews).filter((key) => key !== state.todayKey).sort().reverse();
const latestPreviousDateKey = previousDateKeys[0];
```

Inside the data section, before export:

```tsx
{latestPreviousDateKey && (
  <button className="secondaryButton" onClick={() => actions.copyUnfinished(latestPreviousDateKey)}>
    复制昨日未完成任务
  </button>
)}
```

- [ ] **Step 7: Run rollover and provider tests**

Run:

```bash
npm test -- src/domain/dayRollover.test.ts src/state/useStudyStore.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit rollover**

```bash
git add src/domain/dayRollover.ts src/domain/dayRollover.test.ts src/state/useStudyStore.tsx src/components/ParentDashboard.tsx
git commit -m "feat: add day rollover handling"
```

### Task 12: End-To-End Tablet Verification

**Files:**
- Create: `e2e/study-companion.spec.ts`
- Modify: `src/styles.css` if visual issues are found

- [ ] **Step 1: Write Playwright workflow test**

Create `e2e/study-companion.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("tablet parent-child study workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /学习伙伴/ })).toBeVisible();

  await page.getByRole("button", { name: "家长模式" }).click();
  await page.getByLabel("任务名称").fill("语文练习");
  await page.getByRole("button", { name: "添加任务" }).click();
  await expect(page.getByText("语文练习")).toBeVisible();

  await page.getByRole("button", { name: "回到首页" }).click();
  await page.getByRole("button", { name: "孩子模式" }).click();
  await page.getByRole("button", { name: "开始 语文练习" }).click();
  await expect(page.getByText("专注中")).toBeVisible();
  await expect(page.getByLabel("剩余时间")).toBeVisible();
  await page.getByRole("button", { name: "完成本轮专注" }).click();
  await expect(page.getByText("今日任务")).toBeVisible();
});
```

- [ ] **Step 2: Run all automated tests**

Run:

```bash
npm test
npm run build
npm run e2e
```

Expected: unit/integration tests pass, production build succeeds, and Playwright tablet test passes.

- [ ] **Step 3: Manually inspect tablet and desktop sizes**

Run:

```bash
npm run dev -- --port 4173
```

Open `http://127.0.0.1:4173` and inspect:

- Tablet viewport around `810x1080`.
- Desktop viewport around `1280x800`.
- Home mode, child dashboard, focus view, parent dashboard.
- Buttons are at least 44px tall.
- Text does not overlap task cards, timer, or review panel.
- Pet panel is visible and not hidden below the fold on tablet first screen.

- [ ] **Step 4: Fix visual issues with scoped CSS changes**

If inspection shows layout problems, edit only `src/styles.css`. Keep the existing restrained palette and 8px radius. Do not add decorative gradient blobs or marketing hero sections.

- [ ] **Step 5: Commit e2e verification**

```bash
git add e2e/study-companion.spec.ts src/styles.css
git commit -m "test: add tablet workflow verification"
```

## Self-Review Notes

- Spec coverage: this plan covers fake login, child mode, parent mode, task creation, confirmation rules, focus timer, quiet/lively modes, stuck action, pet energy/care/streak growth, local storage, export/clear data, day rollover, parent review, tablet layout, and automated verification.
- Scope control: built-in learning content, real accounts, cloud sync, teacher accounts, scoring, wrong-question books, payments, and rankings remain out of scope.
- Type consistency: task statuses, settings names, reward function names, and store action names are defined before use and reused consistently across later tasks.
