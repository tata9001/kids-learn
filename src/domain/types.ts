export type AppMode = "home" | "child" | "parent" | "focus" | "cats";
export type TaskType = "homework" | "reading" | "handwriting" | "organization";
export type Subject = "chinese" | "math" | "english" | "other";
export type FocusPresentation = "quiet" | "lively";
export type DifficultyLevel = "none" | "a-little" | "needs-parent";
export type RecurrenceKind = "once" | "daily" | "weekly";
export type TaskStatus =
  | "not-started"
  | "focusing"
  | "child-marked-complete"
  | "waiting-confirmation"
  | "completed"
  | "needs-adjustment"
  | "canceled"
  | "archived";

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

export interface CompletionDetails {
  childNote?: string;
  difficulty?: DifficultyLevel;
  actualReadingMinutes?: number;
  bookName?: string;
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
  recurringTemplateId?: string;
  completionDetails?: CompletionDetails;
  parentComment?: string;
  rewardGranted?: boolean;
  completedAt?: string;
  canceledAt?: string;
  archivedAt?: string;
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
  name?: string;
  level: number;
  energy: number;
  experience: number;
  experienceToNextLevel: number;
  mood: "calm" | "happy" | "proud";
  careItems: number;
  unlockedDecorations: string[];
  ownedDecorationIds: string[];
  equippedDecorationId?: string;
  streakDays: number;
  recentReward: string;
  nextUnlock: string;
  speech?: PetSpeech;
}

export type PetSpeechKind = "greeting" | "start" | "focus" | "task" | "streak" | "comfort" | "coach" | "decoration";

export interface PetSpeech {
  id: string;
  kind: PetSpeechKind;
  text: string;
  createdAt: string;
  source: "local";
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
  version: 2;
  mode: AppMode;
  todayKey: string;
  activeTaskId?: string;
  activeSessionId?: string;
  profile: Profile;
  settings: Settings;
  tasks: Record<string, Task>;
  recurringTaskTemplates: Record<string, RecurringTaskTemplate>;
  focusSessions: Record<string, FocusSession>;
  pet: PetState;
  reviews: Record<string, DailyReview>;
}
