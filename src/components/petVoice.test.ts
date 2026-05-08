import { afterEach, describe, expect, it, vi } from "vitest";
import { speakKittenLine } from "./petVoice";

class MockSpeechSynthesisUtterance {
  lang = "";
  pitch = 1;
  rate = 1;
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  volume = 1;

  constructor(text: string) {
    this.text = text;
  }
}

describe("pet voice", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: undefined
    });
  });

  it("speaks kitten lines with a child-friendly Chinese voice profile", () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { cancel, speak }
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance
    });

    const spoken = speakKittenLine("小奶糖想说：先做一小步。");

    expect(spoken).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toMatchObject({
      text: "小奶糖想说：先做一小步。",
      lang: "zh-CN",
      rate: 0.92,
      pitch: 1.28,
      volume: 0.95
    });
  });

  it("does nothing when local speech synthesis is unavailable", () => {
    expect(speakKittenLine("小猫说话")).toBe(false);
  });
});
