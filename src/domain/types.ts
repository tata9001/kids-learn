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
