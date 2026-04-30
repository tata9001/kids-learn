# Task Management, Recurrence, And Pet Upgrade Design

## Goal

Improve the study companion so parents can manage tasks after creation, routine tasks can repeat automatically, children or parents can record completion details, and the pet reward experience feels clearer and more motivating.

This work extends the existing local-first Vite React app. It keeps the current parent-child flow intact: parents prepare and review tasks, children execute tasks, and the app stores state in versioned local browser data.

## Scope

In scope:

- Edit and delete tasks that have not started.
- Cancel or archive tasks that already have activity while preserving history.
- Add text-only completion details from children and parent confirmation comments.
- Support recurring tasks for today only, every day, or selected weekdays.
- Automatically generate due recurring task instances when the app opens on a matching day.
- Improve pet progression with XP, visible progress, recent reward messages, and next-unlock hints.

Out of scope:

- Photo upload or evidence attachments.
- Monthly recurrence rules.
- Calendar planner views.
- Cloud sync or accounts.
- Pet mini-games or complex pet-care actions.

## Product Behavior

### Task Editing And Removal

Parents manage tasks from the existing parent dashboard instead of a separate planner page.

For tasks with status `not-started`, parents can:

- Edit task name.
- Edit task type.
- Edit estimated focus blocks.
- Edit completion standard.
- Edit whether parent confirmation is required.
- Edit recurrence settings.
- Delete the task from today's plan.

For tasks that have already started, been marked complete, are waiting for confirmation, need adjustment, or are completed, parents cannot destructively delete the task. Instead, the app offers a softer `取消今日任务` or archive action.

Cancelled tasks should disappear from the child's active task list, but remain visible in parent history and review where needed. This protects focus-session history, completion records, and pet rewards from being silently rewritten.

### Completion Details

When a child taps complete, the app opens a small completion detail step before changing task status.

Completion details include:

- Optional child note: what was completed or what felt difficult.
- Optional difficulty choice: `没有`, `有一点`, or `需要家长看看`.
- For reading tasks, actual reading minutes and optional book name.

If a task requires parent confirmation, these details are visible in the parent confirmation area. The parent can add a short encouragement or review comment before confirming or asking for adjustment.

If a task does not require parent confirmation, completion details are saved directly with the completed task.

No photo or file upload is included in this version.

### Repeating Tasks

A task can use one of three schedule settings:

- `只今天`
- `每天`
- `每周几天`

For `每周几天`, parents choose one or more weekdays. This is the only custom recurrence rule in this version.

Recurring tasks are stored as templates. A generated task for today is a normal task instance, so child focus, completion, parent confirmation, review, and rewards continue to use the same task workflow.

When the app opens or rolls over to a new day, it generates task instances for due recurring templates. Generation must be idempotent: refreshing the app or opening it multiple times on the same day must not create duplicates.

Editing a generated recurring task asks parents to choose between:

- Update only today's task.
- Update the recurring template for future days.

Deleting a `not-started` generated task removes only today's task instance. Stopping future generation uses a separate `暂停重复任务` action on the template.

### Pet Upgrade Experience

The pet upgrade system should feel more legible and rewarding without becoming a separate game.

Pet state gains:

- XP toward the next level.
- XP required for the next level.
- Recent reward message.
- Next-unlock hint.
- Clearer milestone decorations.

Reward behavior:

- Completing a focus block gives energy and XP.
- Completing a task gives a care item and XP.
- Meeting the daily goal increases streak and gives a larger celebration.
- Level-up happens when XP reaches the next threshold.
- Streak milestones still unlock decorations.

The pet panel shows:

- Level.
- Energy.
- XP progress.
- Streak days.
- Care item count.
- Recent reward message.
- Next unlock hint.

After a reward, the UI shows a lightweight celebration message near the pet. This should be calm and encouraging, not a distracting animation-heavy game layer.

## Architecture

The implementation should preserve the current structure:

- Domain modules own rules and state transitions.
- React components stay thin and call typed store actions.
- Local storage continues to persist the versioned state object.

Expected domain changes:

- Extend `Task` with edit/cancel metadata and completion details.
- Add `RecurringTaskTemplate` records to `StudyState`.
- Add recurrence generation logic in a focused module such as `src/domain/recurrence.ts`.
- Extend `src/domain/tasks.ts` with edit, delete, cancel, completion-detail, and parent-comment transitions.
- Extend `src/domain/rewards.ts` with XP, level thresholds, recent reward, and next unlock calculations.
- Update day rollover so recurring tasks generate before dashboards render.

The design should avoid broad refactors unrelated to these behaviors. If `ParentDashboard` becomes too large while adding edit forms and recurrence controls, extract focused components such as task editor, recurrence controls, and confirmation details.

## Data Model

`Task` should support:

- Recurrence template link for generated tasks.
- Cancelled or archived state.
- Completion detail fields.
- Parent confirmation comment.
- Timestamps for edited, cancelled, and completed states where useful.

`RecurringTaskTemplate` is used only for repeating tasks. It should include:

- Template ID.
- Base task fields: name, type, subject, estimated blocks, standard, confirmation requirement.
- Recurrence kind: daily or selected weekdays.
- Selected weekdays for weekly rules.
- Active or paused status.
- Generated instance tracking sufficient to prevent duplicates.

`PetState` should support:

- Level.
- Energy.
- XP.
- XP needed for next level.
- Mood.
- Care items.
- Streak days.
- Unlocked decorations.
- Recent reward message.
- Next unlock hint.

Storage may require a version bump and migration from the existing version 1 state. Existing users should keep current tasks, settings, review data, and pet data, with new fields filled by defaults.

## Error Handling And Edge Cases

Task management:

- Empty task names remain invalid.
- Deleting a `not-started` task removes it from today's task list.
- Cancelling a task with history does not remove focus sessions or completed review entries.
- Child dashboards should hide cancelled or archived tasks from active work.
- Parent dashboards should still make cancelled or archived tasks understandable.

Completion details:

- Notes are optional and should not block completion.
- Reading minutes should accept reasonable numeric values only.
- Parent comments are optional.

Recurrence:

- Weekly recurrence must require at least one selected weekday.
- Generated tasks must not duplicate on refresh.
- Paused templates stop future generation but do not remove existing task history.
- Editing only today's generated task must not mutate the template.
- Editing the template affects future generated tasks, not already completed history.

Pet rewards:

- Rewards must not be granted twice for the same task completion or parent confirmation.
- XP overflow should carry into the next level.
- Recent reward messages should update on meaningful reward events.

## Testing Strategy

Unit tests should cover:

- Editing and deleting `not-started` tasks.
- Cancelling tasks with existing activity.
- Completion details for normal and reading tasks.
- Parent confirmation comments.
- Daily recurrence generation.
- Selected-weekday recurrence generation.
- Duplicate prevention during app refresh or repeated rollover.
- Pausing recurring templates.
- Pet XP, level-up, recent reward messages, and next-unlock hints.

Integration tests should cover:

- Parent creates, edits, and deletes a `not-started` task.
- Child completes a task with completion details.
- Parent reviews details and confirms with a comment.
- A selected-weekday recurring task appears automatically on a matching day.
- Pet panel updates after focus and task rewards.

Browser/tablet smoke testing should cover:

- Parent task management controls remain usable on tablet widths.
- Child completion detail step is readable and low-friction.
- Pet progress and reward messages do not crowd the focus screen or dashboard.

## Acceptance Criteria

This feature is complete when:

- Parents can edit and delete tasks that have not started.
- Parents can cancel active or historical tasks without deleting reward or review history.
- Children can add text-only completion details.
- Parents can read completion details and add a confirmation comment.
- Parents can create daily and selected-weekday recurring tasks.
- Due recurring tasks appear automatically once per day without duplication.
- Parents can pause recurring templates.
- Pet level progress, recent reward, and next unlock are visible and update after rewards.
- Existing local data migrates without losing current task, review, settings, or pet state.
