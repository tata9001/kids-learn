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
