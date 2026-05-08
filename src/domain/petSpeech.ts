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
