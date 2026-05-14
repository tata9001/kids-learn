import { describe, expect, it, vi } from "vitest";
import { handleKittenVoiceRequest, KITTEN_TTS_INSTRUCTIONS, MAX_CHAT_MESSAGE_LENGTH, MAX_SPEECH_TEXT_LENGTH } from "./index";

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

function chatRequest(body: Record<string, unknown>, origin = "http://127.0.0.1:5173") {
  return new Request("https://voice.example.com/kitten-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin
    },
    body: JSON.stringify(body)
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

  it("returns 400 for empty chat messages", async () => {
    const fetcher = vi.fn();

    const response = await handleKittenVoiceRequest(chatRequest({ message: "   " }), env, fetcher);

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Child message is required." });
  });

  it("returns a local adult escalation for unsafe chat messages without calling OpenAI", async () => {
    const fetcher = vi.fn();

    const response = await handleKittenVoiceRequest(chatRequest({ message: "我不想活了", petName: "豆豆" }), env, fetcher);

    expect(response.status).toBe(200);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      text: "这听起来有点重要，豆豆想让你找爸爸妈妈或老师一起说。你不用一个人扛着。",
      emotion: "care",
      nextAction: "找爸爸妈妈或老师一起说",
      shouldAskAdult: true,
      source: "local"
    });
  });

  it("sends bounded companion chat requests to OpenAI Responses API", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(_input).toBe("https://api.openai.com/v1/responses");
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-openai-key");
      const payload = JSON.parse(String(init?.body));
      expect(payload.model).toBe("gpt-4.1-mini");
      expect(payload.temperature).toBe(0.7);
      expect(JSON.stringify(payload.input)).toContain("你是一只陪孩子写作业的小猫");
      expect(JSON.stringify(payload.input)).toContain("不能直接给作业答案");
      expect(JSON.stringify(payload.input)).toContain("猫".repeat(MAX_CHAT_MESSAGE_LENGTH));
      expect(JSON.stringify(payload.input)).not.toContain("猫".repeat(MAX_CHAT_MESSAGE_LENGTH + 1));
      expect(payload.text.format.schema.required).toEqual(["text", "emotion", "nextAction", "shouldAskAdult"]);

      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    text: "我听见你有点烦，也真的卡住了。我们先圈出题目里最重要的一个词，我陪你看第一步。",
                    emotion: "coach",
                    nextAction: "圈出题目关键词",
                    shouldAskAdult: false
                  })
                }
              ]
            }
          ]
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    });

    const response = await handleKittenVoiceRequest(
      chatRequest({
        message: "猫".repeat(MAX_CHAT_MESSAGE_LENGTH + 20),
        petName: "豆豆",
        petLevel: 4,
        currentTaskName: "数学口算",
        trigger: "message"
      }),
      env,
      fetcher
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      text: "我听见你有点烦，也真的卡住了。我们先圈出题目里最重要的一个词，我陪你看第一步。",
      emotion: "coach",
      nextAction: "圈出题目关键词",
      shouldAskAdult: false,
      source: "ai"
    });
  });

  it("returns a safe local fallback when OpenAI chat fails", async () => {
    const fetcher = vi.fn(async () => new Response("bad upstream", { status: 500 }));

    const response = await handleKittenVoiceRequest(chatRequest({ message: "我不会", petName: "豆豆" }), env, fetcher);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      text: "豆豆听见你了。我们先不求答案，先把题目读一遍，圈出最关键的一个词。",
      emotion: "coach",
      nextAction: "圈出题目关键词",
      shouldAskAdult: false,
      source: "local"
    });
  });
});
