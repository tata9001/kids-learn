import type { ChildCompanionProfile, KittenMemoryCandidate, StudyState } from "./types";

export type NewKittenMemoryCandidate = Pick<KittenMemoryCandidate, "kind" | "text" | "confidence">;

const MAX_MEMORY_TEXT_LENGTH = 80;
const MAX_PENDING_CANDIDATES = 20;
const MAX_APPROVED_MEMORIES = 30;
const SENSITIVE_MEMORY_PATTERN = /\d{11}|电话|手机号|住址|地址|身份证|学校全名|医院|诊断|不要告诉/;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function sanitizeMemoryText(text: string): string {
  return Array.from(text.trim()).slice(0, MAX_MEMORY_TEXT_LENGTH).join("");
}

function isSafeMemoryText(text: string): boolean {
  return text.length > 0 && !SENSITIVE_MEMORY_PATTERN.test(text);
}

function clampConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0;
  return Math.min(1, Math.max(0, confidence));
}

export function updateChildCompanionProfile(
  state: StudyState,
  updates: Partial<ChildCompanionProfile>
): StudyState {
  return {
    ...state,
    childCompanionProfile: {
      ...state.childCompanionProfile,
      ...updates,
      favoriteColors: updates.favoriteColors ?? state.childCompanionProfile.favoriteColors,
      favoriteDecorations: updates.favoriteDecorations ?? state.childCompanionProfile.favoriteDecorations,
      trickySubjects: updates.trickySubjects ?? state.childCompanionProfile.trickySubjects
    }
  };
}

export function addKittenMemoryCandidates(
  state: StudyState,
  candidates: NewKittenMemoryCandidate[],
  createdAt: string
): StudyState {
  const safeCandidates = candidates.flatMap((candidate) => {
    const text = sanitizeMemoryText(candidate.text);
    if (!isSafeMemoryText(text)) return [];

    return [
      {
        id: createId("kitten-memory-candidate"),
        kind: candidate.kind,
        text,
        confidence: clampConfidence(candidate.confidence),
        createdAt,
        status: "pending-parent" as const
      }
    ];
  });

  return {
    ...state,
    pendingKittenMemoryCandidates: [...state.pendingKittenMemoryCandidates, ...safeCandidates].slice(-MAX_PENDING_CANDIDATES)
  };
}

export function approveKittenMemoryCandidate(
  state: StudyState,
  candidateId: string,
  text: string,
  approvedAt: string
): StudyState {
  const candidate = state.pendingKittenMemoryCandidates.find((memoryCandidate) => memoryCandidate.id === candidateId);
  if (!candidate) return state;

  const sanitizedText = sanitizeMemoryText(text);
  if (!isSafeMemoryText(sanitizedText)) return state;

  const pendingKittenMemoryCandidates = state.pendingKittenMemoryCandidates.filter(
    (memoryCandidate) => memoryCandidate.id !== candidateId
  );

  return {
    ...state,
    pendingKittenMemoryCandidates,
    approvedKittenMemories: [
      ...state.approvedKittenMemories,
      {
        id: createId("kitten-memory"),
        kind: candidate.kind,
        text: sanitizedText,
        createdAt: candidate.createdAt,
        approvedAt,
        source: "parent" as const
      }
    ].slice(-MAX_APPROVED_MEMORIES)
  };
}

export function rejectKittenMemoryCandidate(state: StudyState, candidateId: string): StudyState {
  return {
    ...state,
    pendingKittenMemoryCandidates: state.pendingKittenMemoryCandidates.filter((candidate) => candidate.id !== candidateId)
  };
}

export function deleteKittenMemory(state: StudyState, memoryId: string): StudyState {
  return {
    ...state,
    approvedKittenMemories: state.approvedKittenMemories.filter((memory) => memory.id !== memoryId)
  };
}

export function clearKittenMemories(state: StudyState): StudyState {
  return {
    ...state,
    pendingKittenMemoryCandidates: [],
    approvedKittenMemories: []
  };
}
