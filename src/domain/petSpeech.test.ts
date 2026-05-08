import { describe, expect, it } from "vitest";
import { clearPetName, getPetDisplayName, makePetSpeak, renamePet } from "./petSpeech";
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
