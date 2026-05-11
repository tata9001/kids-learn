import type { PetSpeech, PetSpeechKind, PetState, StudyState } from "./types";

export const DEFAULT_PET_NAME = "小奶糖";
export const MAX_PET_NAME_LENGTH = 8;

export type PetSpeechTrigger =
  | "manual"
  | "greeting"
  | "start"
  | "focus"
  | "task"
  | "streak"
  | "comfort"
  | "coach"
  | "decoration"
  | "low-energy";

export type StudyCompanionTrigger = "start" | "reluctant" | "stuck" | "done" | "encourage" | "message";

export const MAX_COMPANION_INPUT_LENGTH = 80;

export function sanitizePetName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  return Array.from(trimmed).slice(0, MAX_PET_NAME_LENGTH).join("");
}

export function getPetDisplayName(pet: Pick<PetState, "name">): string {
  return pet.name ? sanitizePetName(pet.name) ?? DEFAULT_PET_NAME : DEFAULT_PET_NAME;
}

function speechKindForTrigger(trigger: PetSpeechTrigger): PetSpeechKind {
  if (trigger === "manual") return "coach";
  if (trigger === "low-energy") return "comfort";
  return trigger;
}

function lineForTrigger(pet: PetState, trigger: PetSpeechTrigger): string {
  const name = getPetDisplayName(pet);
  const lines: Record<PetSpeechTrigger, string> = {
    manual: `${name}想说：我们先做最小的一步，好不好？`,
    greeting: `${name}在这里等你，今天也一起慢慢变厉害。`,
    start: `${name}已经坐好了，陪你进入学习状态。`,
    focus: `我看到你坚持完了，${name}的尾巴都开心起来了。`,
    task: `这个任务被你拿下啦，${name}想收进今天的纪念里。`,
    streak: `这是我们的坚持纪念，${name}想把它放进收藏里。`,
    comfort: `${name}会陪着你，我们只要先完成一小步。`,
    coach: `${name}提醒你：先开始，比一次做完更重要。`,
    decoration: `${name}换好装饰啦，看起来更有精神。`,
    "low-energy": `${name}有点想补充能量，我们先完成一个小目标吧。`
  };

  return lines[trigger];
}

export function buildPetSpeech(pet: PetState, trigger: PetSpeechTrigger, createdAt: string): PetSpeech {
  return {
    id: `pet-speech-${createdAt}`,
    kind: speechKindForTrigger(trigger),
    text: lineForTrigger(pet, trigger),
    createdAt,
    source: "local"
  };
}

export function sanitizeCompanionMessage(message: string): string {
  return Array.from(message.trim()).slice(0, MAX_COMPANION_INPUT_LENGTH).join("");
}

function isUnsafeCompanionMessage(message: string): boolean {
  return /不想活|想死|自杀|伤害自己|打我|害怕回家|没人救|救救我/.test(message);
}

export function detectStudyCompanionTrigger(message: string): Exclude<StudyCompanionTrigger, "message"> | "unsafe" | "generic" {
  const line = sanitizeCompanionMessage(message);
  if (!line) return "generic";
  if (isUnsafeCompanionMessage(line)) return "unsafe";
  if (/不会|不懂|很难|太难|难|卡住/.test(line)) return "stuck";
  if (/不想|烦|累|讨厌/.test(line)) return "reluctant";
  if (/写完|完成|做好|做完/.test(line)) return "done";
  if (/开始|陪我/.test(line)) return "start";
  return "generic";
}

function studyCompanionKindForTrigger(trigger: Exclude<StudyCompanionTrigger, "message"> | "unsafe" | "generic"): PetSpeechKind {
  if (trigger === "reluctant" || trigger === "unsafe" || trigger === "encourage") return "comfort";
  if (trigger === "done") return "task";
  return "coach";
}

function lineForStudyCompanionTrigger(
  pet: PetState,
  trigger: Exclude<StudyCompanionTrigger, "message"> | "unsafe" | "generic"
): string {
  const name = getPetDisplayName(pet);
  const lines: Record<Exclude<StudyCompanionTrigger, "message"> | "unsafe" | "generic", string> = {
    start: `${name}坐到你旁边啦。我们不做全部，先看第一题 30 秒，好不好？`,
    reluctant: `不想开始也没关系，开始本来就有点难。我们先把作业本打开，只做这一小步。`,
    stuck: `卡住不是失败，是题目在提醒我们慢一点。先圈出题目里最重要的一个词吧。`,
    done: `你是一步一步写完的，不是一下子变出来的。我想把这次坚持放进今天的成长记忆里。`,
    encourage: `你不用一下子很厉害，只要先往前挪一小步。${name}会在旁边陪你。`,
    unsafe: `这听起来有点重要，${name}想让你找爸爸妈妈或老师一起说。你不用一个人扛着。`,
    generic: `我听见啦。我们先把它变成一个小小的动作，做完这一点再看下一步。`
  };

  return lines[trigger];
}

export function buildStudyCompanionSpeech(
  pet: PetState,
  trigger: StudyCompanionTrigger,
  childMessage: string | undefined,
  createdAt: string
): PetSpeech | undefined {
  const resolvedTrigger = trigger === "message" ? detectStudyCompanionTrigger(childMessage ?? "") : trigger;
  if (trigger === "message" && !sanitizeCompanionMessage(childMessage ?? "")) return undefined;

  return {
    id: `pet-speech-${createdAt}`,
    kind: studyCompanionKindForTrigger(resolvedTrigger),
    text: lineForStudyCompanionTrigger(pet, resolvedTrigger),
    createdAt,
    source: "local"
  };
}

export function makeStudyCompanionSpeak(
  state: StudyState,
  trigger: StudyCompanionTrigger,
  childMessage?: string,
  createdAt = new Date().toISOString()
): StudyState {
  const speech = buildStudyCompanionSpeech(state.pet, trigger, childMessage, createdAt);
  if (!speech) return state;

  return {
    ...state,
    pet: {
      ...state.pet,
      speech
    }
  };
}

export function makePetSpeak(state: StudyState, trigger: PetSpeechTrigger, createdAt = new Date().toISOString()): StudyState {
  return {
    ...state,
    pet: {
      ...state.pet,
      speech: buildPetSpeech(state.pet, trigger, createdAt)
    }
  };
}

export function renamePet(state: StudyState, name: string, createdAt = new Date().toISOString()): StudyState {
  const nextName = sanitizePetName(name);
  if (!nextName) return state;

  const pet = {
    ...state.pet,
    name: nextName
  };

  return {
    ...state,
    pet: {
      ...pet,
      speech: {
        id: `pet-speech-${createdAt}`,
        kind: "greeting",
        text: `以后我就叫${nextName}啦，我会记得和你一起长大。`,
        createdAt,
        source: "local"
      }
    }
  };
}

export function clearPetName(state: StudyState, createdAt = new Date().toISOString()): StudyState {
  const { name: _name, ...petWithoutName } = state.pet;

  return {
    ...state,
    pet: {
      ...petWithoutName,
      speech: {
        id: `pet-speech-${createdAt}`,
        kind: "greeting",
        text: `我又回到${DEFAULT_PET_NAME}这个名字啦，也会继续陪着你。`,
        createdAt,
        source: "local"
      }
    }
  };
}
