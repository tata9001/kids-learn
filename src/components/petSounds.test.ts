import { describe, expect, it } from "vitest";
import { getKittenSoundPattern } from "./petSounds";

describe("pet sounds", () => {
  it("uses distinct sound patterns for different kitten interactions", () => {
    expect(getKittenSoundPattern("pet").frequencies).not.toEqual(getKittenSoundPattern("feed").frequencies);
    expect(getKittenSoundPattern("feed").frequencies).not.toEqual(getKittenSoundPattern("play").frequencies);
    expect(getKittenSoundPattern("dress").frequencies).not.toEqual(getKittenSoundPattern("undress").frequencies);
  });
});
