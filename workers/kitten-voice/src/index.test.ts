import { describe, expect, it, vi } from "vitest";
import { handleKittenVoiceRequest, KITTEN_TTS_INSTRUCTIONS, MAX_SPEECH_TEXT_LENGTH } from "./index";

const env = {
  OPENAI_API_KEY: "test-openai-key"
};

function speechRequest(text: string, origin = "http://127.0.0.1:5173") {
  return new Request("https://voice.example.com/kitten-speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin
    },
    body: JSON.stringify({ text })
  });
}

describe("kitten voice worker", () => {
  it("returns 400 for empty speech text", async () => {
    const fetcher = vi.fn();

    const response = await handleKittenVoiceRequest(speechRequest("   "), env, fetcher);

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Speech text is required." });
  });

  it("caps overlong text before sending it to OpenAI", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body));
      expect(payload.input).toBe("猫".repeat(MAX_SPEECH_TEXT_LENGTH));
      return new Response("mp3-bytes", {
        headers: { "Content-Type": "audio/mpeg" }
      });
    });

    const response = await handleKittenVoiceRequest(speechRequest("猫".repeat(MAX_SPEECH_TEXT_LENGTH + 10)), env, fetcher);

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("forwards valid speech requests to OpenAI with kitten voice settings", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(_input).toBe("https://api.openai.com/v1/audio/speech");
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-openai-key");
      expect(JSON.parse(String(init?.body))).toEqual({
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: "团团想说：我们先做最小的一步，好不好？",
        instructions: KITTEN_TTS_INSTRUCTIONS
      });
      return new Response("mp3-bytes", {
        headers: { "Content-Type": "audio/mpeg" }
      });
    });

    const response = await handleKittenVoiceRequest(speechRequest(" 团团想说：我们先做最小的一步，好不好？ "), env, fetcher);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(await response.text()).toBe("mp3-bytes");
  });

  it("returns 502 when OpenAI speech generation fails", async () => {
    const fetcher = vi.fn(async () => new Response("bad upstream", { status: 500 }));

    const response = await handleKittenVoiceRequest(speechRequest("小猫说话"), env, fetcher);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "AI voice generation failed." });
  });

  it("handles CORS preflight requests", async () => {
    const response = await handleKittenVoiceRequest(
      new Request("https://voice.example.com/kitten-speech", {
        method: "OPTIONS",
        headers: { Origin: "https://tata9001.github.io" }
      }),
      env,
      vi.fn()
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://tata9001.github.io");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
  });
});
