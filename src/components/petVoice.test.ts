import { afterEach, describe, expect, it, vi } from "vitest";
import { isAiKittenVoiceConfigured, speakKittenLine } from "./petVoice";

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

  it("speaks kitten lines with a child-friendly Chinese voice profile when no AI endpoint is configured", async () => {
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

    const spoken = await speakKittenLine("小奶糖想说：先做一小步。");

    expect(spoken).toBe("local");
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

  it("plays AI voice audio when an endpoint is configured", async () => {
    const play = vi.fn(async () => undefined);
    const revokeObjectURL = vi.fn();
    const createObjectURL = vi.fn(() => "blob:kitten-voice");
    const fetcher = vi.fn(
      async () => new Response(new Blob(["mp3"], { type: "audio/mpeg" }), { status: 200, headers: { "Content-Type": "audio/mpeg" } })
    );

    const result = await speakKittenLine("小猫说话", {
      voiceApiUrl: "https://voice.example.com/kitten-speech",
      fetcher,
      createObjectURL,
      revokeObjectURL,
      audioFactory: (url) => {
        expect(url).toBe("blob:kitten-voice");
        return { play };
      }
    });

    expect(result).toBe("ai");
    expect(fetcher).toHaveBeenCalledWith("https://voice.example.com/kitten-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "小猫说话" })
    });
    expect(play).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:kitten-voice");
  });

  it("falls back to local browser voice when AI voice fails", async () => {
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
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "bad" }), { status: 502 }));

    const result = await speakKittenLine("小猫说话", {
      voiceApiUrl: "https://voice.example.com/kitten-speech",
      fetcher
    });

    expect(result).toBe("local");
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("does nothing when no voice mechanism is available", async () => {
    await expect(speakKittenLine("小猫说话")).resolves.toBe("silent");
  });

  it("detects whether AI voice is configured", () => {
    expect(isAiKittenVoiceConfigured("https://voice.example.com/kitten-speech")).toBe(true);
    expect(isAiKittenVoiceConfigured("")).toBe(false);
  });
});
