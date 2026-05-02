import { todayKey } from "./date";
import type { RecurringTaskTemplate, StudyState, Task } from "./types";
import type { NewTaskInput } from "./tasks";

export interface NewRecurringTaskInput extends NewTaskInput {
  recurrence: "daily" | "weekly";
  weekdays?: number[];
  createdAt: string;
}

function nextTemplateId(existing: Record<string, unknown>): string {
  return `template-${Object.keys(existing).length + 1}`;
}

function shouldGenerate(template: RecurringTaskTemplate, date: Date, dateKey: string): boolean {
  if (template.paused || template.generatedDateKeys.includes(dateKey)) return false;
  if (template.recurrence === "daily") return true;
  return template.weekdays.includes(date.getDay());
}

export function createRecurringTaskTemplate(state: StudyState, input: NewRecurringTaskInput): StudyState {
  const weekdays = input.recurrence === "weekly" ? Array.from(new Set(input.weekdays ?? [])).sort() : [];
  if (input.recurrence === "weekly" && weekdays.length === 0) return state;

  const id = nextTemplateId(state.recurringTaskTemplates);
  const template: RecurringTaskTemplate = {
    id,
    name: input.name.trim(),
    type: input.type,
    subject: input.type === "homework" ? input.subject ?? "other" : undefined,
    estimatedFocusBlocks: input.estimatedFocusBlocks,
    completionStandard: input.completionStandard.trim(),
    requiresConfirmation: input.requiresConfirmation,
    recurrence: input.recurrence,
    weekdays,
    paused: false,
    createdAt: input.createdAt,
    generatedDateKeys: []
  };

  const nextState: StudyState = {
    ...state,
    recurringTaskTemplates: {
      ...state.recurringTaskTemplates,
      [id]: template
    }
  };

  const createdDate = new Date(input.createdAt);
  return todayKey(createdDate) === state.todayKey ? generateDueRecurringTasks(nextState, createdDate) : nextState;
}

export function pauseRecurringTaskTemplate(state: StudyState, templateId: string): StudyState {
  const template = state.recurringTaskTemplates[templateId];
  if (!template) return state;

  return {
    ...state,
    recurringTaskTemplates: {
      ...state.recurringTaskTemplates,
      [templateId]: {
        ...template,
        paused: true
      }
    }
  };
}

export function generateDueRecurringTasks(state: StudyState, date: Date): StudyState {
  const dateKey = todayKey(date);
  const tasks: Record<string, Task> = { ...state.tasks };
  const recurringTaskTemplates = { ...state.recurringTaskTemplates };
  let changed = false;

  for (const template of Object.values(state.recurringTaskTemplates)) {
    if (!shouldGenerate(template, date, dateKey)) continue;

    const id = `task-${template.id}-${dateKey}`;
    tasks[id] = {
      id,
      name: template.name,
      type: template.type,
      subject: template.subject,
      estimatedFocusBlocks: template.estimatedFocusBlocks,
      completionStandard: template.completionStandard,
      requiresConfirmation: template.requiresConfirmation,
      status: "not-started",
      dateKey,
      recurringTemplateId: template.id
    };
    recurringTaskTemplates[template.id] = {
      ...template,
      generatedDateKeys: Array.from(new Set([...template.generatedDateKeys, dateKey]))
    };
    changed = true;
  }

  return changed
    ? {
        ...state,
        tasks,
        recurringTaskTemplates
      }
    : state;
}
