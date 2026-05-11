import { describe, expect, it } from "vitest";
import {
  buildStudyCompanionSpeech,
  clearPetName,
  getPetDisplayName,
  makePetSpeak,
  renamePet,
  sanitizeCompanionMessage
} from "./petSpeech";
import { testState } from "../test/testState";

describe("pet speech and naming", () => {
  it("renames the kitten with trimmed and length-limited text without losing progress", () => {
    const state = testState({
      pet: {
        ...testState().pet,
        level: 4,
        careItems: 3
      }
    });

    const next = renamePet(state, "  超级勇敢的小奶糖伙伴  ");

    expect(next.pet.name).toBe("超级勇敢的小奶糖");
    expect(next.pet.level).toBe(4);
    expect(next.pet.careItems).toBe(3);
    expect(next.pet.speech?.text).toContain("超级勇敢的小奶糖");
  });

  it("ignores empty kitten names and can return to the default name", () => {
    const named = renamePet(testState(), "豆豆");
    const ignored = renamePet(named, "   ");
    const cleared = clearPetName(named);

    expect(ignored.pet.name).toBe("豆豆");
    expect(cleared.pet.name).toBeUndefined();
    expect(getPetDisplayName(cleared.pet)).toBe("小奶糖");
  });

  it("stores a short local speech record for a trigger", () => {
    const state = renamePet(testState(), "豆豆");
    const next = makePetSpeak(state, "manual", "2026-05-09T08:00:00+08:00");

    expect(next.pet.speech).toMatchObject({
      kind: "coach",
      createdAt: "2026-05-09T08:00:00+08:00",
      source: "local"
    });
    expect(next.pet.speech?.id).toContain("pet-speech");
    expect(next.pet.speech?.text.length).toBeGreaterThan(0);
  });
});

describe("kitten study companion speech", () => {
  it("builds a start companion line that uses the kitten name", () => {
    const state = renamePet(testState(), "豆豆");
    const speech = buildStudyCompanionSpeech(state.pet, "start", undefined, "2026-05-12T08:00:00+08:00");

    if (!speech) throw new Error("expected start companion speech");
    expect(speech).toMatchObject({
      id: "pet-speech-2026-05-12T08:00:00+08:00",
      kind: "coach",
      createdAt: "2026-05-12T08:00:00+08:00",
      source: "local"
    });
    expect(speech.text).toContain("豆豆");
    expect(speech.text).toContain("第一题");
  });

  it("maps short child messages to learning-support intents", () => {
    const pet = testState().pet;
    const textFor = (message: string) => {
      const speech = buildStudyCompanionSpeech(pet, "message", message, "now");
      if (!speech) throw new Error(`expected companion speech for ${message}`);
      return speech.text;
    };

    expect(textFor("我不会这题")).toContain("圈出题目");
    expect(textFor("我不想写了")).toContain("作业本打开");
    expect(textFor("我写完了")).toContain("成长记忆");
    expect(textFor("陪我开始吧")).toContain("第一题");
    expect(textFor("我准备好了")).toContain("小小的动作");
  });

  it("trims overlong companion messages by unicode characters", () => {
    expect(sanitizeCompanionMessage("  １２３４５６７８９０".repeat(9))).toHaveLength(80);
  });

  it("returns undefined for empty companion messages", () => {
    expect(buildStudyCompanionSpeech(testState().pet, "message", "   ", "now")).toBeUndefined();
  });

  it("directs unsafe distress messages to an adult", () => {
    const speech = buildStudyCompanionSpeech(testState().pet, "message", "我不想活了", "now");

    expect(speech?.kind).toBe("comfort");
    expect(speech?.text).toContain("找爸爸妈妈或老师");
    expect(speech?.text).toContain("不用一个人扛着");
  });
});
