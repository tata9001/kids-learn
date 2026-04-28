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
