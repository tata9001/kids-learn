import { createDefaultState } from "../domain/defaultState";
import { sanitizePetName } from "../domain/petSpeech";
import type { PetState, StudyState, Task } from "../domain/types";

export const STORAGE_KEY = "study-companion-state";

type VersionOneTask = Task & {
  actualReadingMinutes?: number;
  bookName?: string;
};

type VersionOneState = Omit<StudyState, "version" | "recurringTaskTemplates" | "pet" | "tasks"> & {
  version: 1;
  tasks: Record<string, VersionOneTask>;
  pet: Omit<
    PetState,
    "experience" | "experienceToNextLevel" | "recentReward" | "nextUnlock" | "ownedDecorationIds" | "equippedDecorationId"
  >;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isVersionTwoStudyState(value: unknown): value is StudyState {
  return Boolean(
    isObject(value) &&
      "version" in value &&
      value.version === 2 &&
      "profile" in value &&
      "tasks" in value &&
      "pet" in value &&
      "recurringTaskTemplates" in value
  );
}

function isVersionOneStudyState(value: unknown): value is VersionOneState {
  return Boolean(
    isObject(value) &&
      "version" in value &&
      value.version === 1 &&
      "profile" in value &&
      "tasks" in value &&
      "pet" in value
  );
}

function migrateTask(task: VersionOneTask): Task {
  const completionDetails =
    task.actualReadingMinutes || task.bookName
      ? {
          actualReadingMinutes: task.actualReadingMinutes,
          bookName: task.bookName
        }
      : task.completionDetails;
  const { actualReadingMinutes: _actualReadingMinutes, bookName: _bookName, ...nextTask } = task;

  return {
    ...nextTask,
    completionDetails
  };
}

function normalizePet(pet: Partial<PetState>): PetState {
  const defaults = createDefaultState().pet;
  const ownedDecorationIds = pet.ownedDecorationIds ?? [];
  const equippedDecorationId =
    pet.equippedDecorationId && ownedDecorationIds.includes(pet.equippedDecorationId) ? pet.equippedDecorationId : undefined;
  const name = typeof pet.name === "string" ? sanitizePetName(pet.name) : undefined;
  const speech =
    pet.speech && typeof pet.speech.text === "string" && typeof pet.speech.createdAt === "string" ? pet.speech : undefined;

  return {
    ...defaults,
    ...pet,
    name,
    unlockedDecorations: pet.unlockedDecorations ?? [],
    ownedDecorationIds,
    equippedDecorationId,
    speech
  };
}

function normalizeStudyState(state: StudyState): StudyState {
  const defaults = createDefaultState();
  const childCompanionProfile = state.childCompanionProfile ?? defaults.childCompanionProfile;

  return {
    ...state,
    childCompanionProfile: {
      ...defaults.childCompanionProfile,
      ...childCompanionProfile,
      favoriteColors: childCompanionProfile.favoriteColors ?? [],
      favoriteDecorations: childCompanionProfile.favoriteDecorations ?? [],
      trickySubjects: childCompanionProfile.trickySubjects ?? []
    },
    pendingKittenMemoryCandidates: Array.isArray(state.pendingKittenMemoryCandidates)
      ? state.pendingKittenMemoryCandidates
      : [],
    approvedKittenMemories: Array.isArray(state.approvedKittenMemories) ? state.approvedKittenMemories : [],
    pet: normalizePet(state.pet)
  };
}

export function migrateStudyState(value: unknown): StudyState {
  if (isVersionTwoStudyState(value)) {
    return normalizeStudyState(value);
  }
  if (!isVersionOneStudyState(value)) return createDefaultState();

  const tasks = Object.fromEntries(Object.entries(value.tasks).map(([id, task]) => [id, migrateTask(task)]));

  return normalizeStudyState({
    ...value,
    version: 2,
    tasks,
    recurringTaskTemplates: {},
    pet: normalizePet({
      ...value.pet,
      experience: 0,
      experienceToNextLevel: 40,
      recentReward: "小猫在等第一个学习奖励",
      nextUnlock: "等级 2 解锁铃铛小猫"
    })
  });
}

export function loadStudyState(): StudyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return migrateStudyState(parsed);
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
