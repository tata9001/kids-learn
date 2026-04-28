# Study Companion Website Design

## Goal

Build a tablet-first parent-child website for early primary school children. The product helps children start homework sooner, stay focused in short study blocks, and build motivation through a pet companion. Parents configure tasks and review progress, while children execute tasks through a simple, encouraging interface.

The first version is not a full learning content platform. It focuses on homework support and habit formation, with simple habit check-ins for reading, handwriting practice, and organization.

## Product Shape

The website has two entry points:

- Child mode: execute today's tasks, run focus timers, see the pet companion, and receive growth feedback.
- Parent mode: create tasks, configure rules, confirm selected tasks, and review daily and weekly progress.

The first version uses fake login and local browser data. It shows separate child and parent modes, but it does not include real accounts, backend storage, cloud sync, SMS login, or permission management.

## Child Mode

Child mode should be simple, visual, and low-friction. The first screen shows the pet companion, today's task list, and a clear start action. Each task card shows the task type, estimated focus blocks, and current status.

When the child starts a task, the site opens a focus timer. The timer supports short focus blocks suitable for young children: 10, 15, or 20 minutes. After a focus block ends, the child sees a short rest state and can choose to continue another block or mark the task complete.

The focus page has two parent-controlled presentation modes:

- Quiet mode: countdown, current task, and calm pet presence.
- Lively mode: light pet animation and occasional encouragement, without games or frequent interactions.

Child mode includes a "stuck" action. It offers low-pressure choices such as starting with 5 minutes, switching tasks, or asking a parent for help. This supports children who delay because starting feels too large or hard to begin.

## Parent Mode

Parent mode emphasizes quick setup, less repeated prompting, and useful review. Parents can create tasks with medium detail:

- Task name.
- Task type: homework, reading, handwriting, or organization.
- Subject for homework tasks: Chinese, math, English, or other.
- Estimated focus blocks.
- Completion standard.
- Whether parent confirmation is required.

Parents can configure:

- Focus duration: 10, 15, or 20 minutes.
- Rest duration: 3, 5, or 10 minutes.
- Focus page mode: quiet or lively.
- Per-task confirmation requirement.
- Daily goals, such as number of focus blocks, completed tasks, and habit tasks.

Parent review has three concise areas:

- Today: completed tasks, total focus time, rest count, and tasks waiting for confirmation.
- Week trend: focus minutes, completion rate, and streak days.
- Communication suggestion: one short, warm suggestion based on the day's behavior.

Task confirmation should be fast. A parent can confirm, ask the child to adjust, or add a short encouragement. The interface should avoid punitive language such as "failed"; use softer states such as "needs adjustment."

## Task And Habit Scope

The first version supports two broad task groups:

- Homework tasks: schoolwork such as Chinese, math, English, or other assignments.
- Habit tasks: reading, handwriting practice, and organization.

Habit tasks use simple check-ins. Reading records planned or actual minutes and may include an optional book name. Handwriting and organization can be completed by child check-in or parent confirmation, depending on the task setting. The first version does not require complex content records.

## Pet Growth Rules

The pet companion provides motivation through three feedback layers:

- Immediate feedback: completing one focus block gives energy and a visible mood change.
- Task feedback: completing a task unlocks a small care item, decoration, or action.
- Long-term feedback: meeting daily goals and maintaining streaks unlocks levels or appearances.

Rules should stay transparent. A simple first version rule set:

- Completed focus block: +10 energy.
- Completed task: +1 care item.
- Completed daily goal: streak increases by 1.
- Streak milestones at 3, 7, and 14 days unlock new appearances or decorations.

If a task requires parent confirmation, the child receives encouragement immediately after marking it complete, but the main pet reward is granted only after parent confirmation.

## Data Model

Store first-version data locally in the browser as a versioned JSON object. `localStorage` is acceptable for the first version. If data becomes larger or more relational, it can later migrate to IndexedDB or a backend database.

Core objects:

- `Profile`: family name, child nickname, and current preferences.
- `Task`: name, type, subject or habit category, estimated focus blocks, completion standard, confirmation requirement, and status.
- `FocusSession`: task ID, start time, end time, planned minutes, completion flag, and interruption count.
- `PetState`: level, energy, mood, unlocked decorations, and streak days.
- `DailyReview`: date, completed task count, focus minutes, streak status, parent confirmations, and communication suggestion.

Task statuses:

- Not started.
- Focusing.
- Child marked complete.
- Waiting for parent confirmation.
- Completed.
- Needs adjustment.

The app should include data export and clear-data actions in parent mode.

## Boundary Cases

The first version should handle common home-use cases:

- Child leaves or refreshes during a timer.
- Child taps complete multiple times.
- Child accidentally enters rest.
- Parent forgets to confirm a task.
- Yesterday's incomplete tasks remain when the app opens the next day.
- Local data cannot be read.

Timer recovery should use the stored start time and planned duration, so a refresh can reconstruct remaining time. Unfinished focus blocks do not grant the main focus reward. Pending confirmations remain visible in parent mode. On a new day, the app creates a new daily review state and lets parents copy unfinished tasks to today.

If local data fails to load, the app should show a parent-facing recovery state with options to export current raw data if possible, reset local data, or continue with defaults.

## Testing Strategy

First-version tests should cover:

- Parent creates homework and habit tasks.
- Child starts and completes a focus block.
- A confirmation-required task enters waiting state, then grants reward after parent confirmation.
- A task without confirmation completes and grants reward immediately.
- Quiet and lively modes change the focus page presentation.
- Daily review and streak behavior work across date changes.
- Export and clear-data actions work.
- Tablet viewport has large enough controls, readable text, and no crowded task or timer layout.

## Acceptance Criteria

The first version is successful when:

- A parent can create the day's task plan in about 3 minutes.
- A child can start a 10-15 minute focus block without explanation.
- Completing a focus block visibly changes the pet's energy or mood.
- Completing tasks and daily goals contributes to pet growth.
- Parent review shows today's progress and one useful communication suggestion.
- The experience works well on tablet-sized screens.

## Out Of Scope For First Version

- Real user accounts.
- Cloud sync.
- Teacher or school accounts.
- Built-in exercise questions.
- Dictation, recitation scoring, wrong-question books, or adaptive learning.
- Payment, social sharing, or rankings.
