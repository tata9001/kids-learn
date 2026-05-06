import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { copyUnfinishedTasksToToday, rolloverToDate } from "../domain/dayRollover";
import { createDefaultState } from "../domain/defaultState";
import { completeFocusSession, recordInterruption, startFocusSession } from "../domain/focus";
import { createRecurringTaskTemplate, pauseRecurringTaskTemplate, type NewRecurringTaskInput } from "../domain/recurrence";
import { refreshDailyReview } from "../domain/review";
import {
  addTask,
  archiveTask,
  cancelTask,
  confirmTask,
  deleteTask,
  markTaskComplete,
  requestTaskAdjustment,
  updateTask,
  type CompletionDetailsInput,
  type NewTaskInput,
  type UpdateTaskInput
} from "../domain/tasks";
import { equipPetDecoration, interactWithPet, purchasePetDecoration, removePetDecoration, type PetInteraction } from "../domain/rewards";
import type { AppMode, Settings, StudyState } from "../domain/types";
import { clearStudyState, loadStudyState, saveStudyState } from "../storage/localStore";

interface StudyActions {
  setMode(mode: AppMode): void;
  addTask(input: NewTaskInput): void;
  addRecurringTask(input: Omit<NewRecurringTaskInput, "createdAt">): void;
  pauseRecurringTask(templateId: string): void;
  updateTask(taskId: string, input: UpdateTaskInput): void;
  deleteTask(taskId: string): void;
  cancelTask(taskId: string): void;
  archiveTask(taskId: string): void;
  updateSettings(settings: Partial<Settings>): void;
  startFocus(taskId: string): void;
  completeFocus(): void;
  interruptFocus(): void;
  markComplete(taskId: string, details?: CompletionDetailsInput): void;
  confirm(taskId: string, parentComment?: string): void;
  adjust(taskId: string): void;
  interactWithPet(interaction: PetInteraction): void;
  purchasePetDecoration(decorationId: string): void;
  equipPetDecoration(decorationId: string): void;
  removePetDecoration(): void;
  copyUnfinished(fromDateKey: string): void;
  resetData(): void;
}

interface StudyStore {
  state: StudyState;
  actions: StudyActions;
}

const StudyContext = createContext<StudyStore | null>(null);

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudyState>(() => rolloverToDate(loadStudyState(), new Date()));

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
      addRecurringTask(input) {
        setState((current) => createRecurringTaskTemplate(current, { ...input, createdAt: new Date().toISOString() }));
      },
      pauseRecurringTask(templateId) {
        setState((current) => pauseRecurringTaskTemplate(current, templateId));
      },
      updateTask(taskId, input) {
        setState((current) => updateTask(current, taskId, input));
      },
      deleteTask(taskId) {
        setState((current) => deleteTask(current, taskId));
      },
      cancelTask(taskId) {
        setState((current) => cancelTask(current, taskId, new Date().toISOString()));
      },
      archiveTask(taskId) {
        setState((current) => archiveTask(current, taskId, new Date().toISOString()));
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
      markComplete(taskId, details) {
        setState((current) => refreshDailyReview(markTaskComplete(current, taskId, new Date().toISOString(), details)));
      },
      confirm(taskId, parentComment) {
        setState((current) => refreshDailyReview(confirmTask(current, taskId, parentComment)));
      },
      adjust(taskId) {
        setState((current) => requestTaskAdjustment(current, taskId));
      },
      interactWithPet(interaction) {
        setState((current) => interactWithPet(current, interaction));
      },
      purchasePetDecoration(decorationId) {
        setState((current) => purchasePetDecoration(current, decorationId));
      },
      equipPetDecoration(decorationId) {
        setState((current) => equipPetDecoration(current, decorationId));
      },
      removePetDecoration() {
        setState((current) => removePetDecoration(current));
      },
      copyUnfinished(fromDateKey) {
        setState((current) => copyUnfinishedTasksToToday(current, fromDateKey));
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
