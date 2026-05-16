import { describe, expect, it, vi } from "vitest";
import { handleKittenVoiceRequest, KITTEN_TTS_INSTRUCTIONS, MAX_CHAT_MESSAGE_LENGTH, MAX_SPEECH_TEXT_LENGTH, MAX_TRANSCRIPT_TEXT_LENGTH } from "./index";

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

function transcriptionRequest(
  origin = "http://127.0.0.1:5173",
  options: { contentType?: string; content?: string; filename?: string } = {}
) {
  const boundary = "----kitten-voice-test";
  const contentType = options.contentType ?? "audio/webm";
  const filename = options.filename ?? "voice.webm";
  const content = options.content ?? "audio-bytes";
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="audio"; filename="${filename}"`,
    `Content-Type: ${contentType}`,
    "",
    content,
    `--${boundary}--`,
    ""
  ].join("\r\n");

  return new Request("https://voice.example.com/kitten-transcribe", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      Origin: origin
    },
    body
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

  it("returns 400 for missing transcription audio", async () => {
    const response = await handleKittenVoiceRequest(
      new Request("https://voice.example.com/kitten-transcribe", {
        method: "POST",
        headers: { Origin: "http://127.0.0.1:5173" },
        body: new FormData()
      }),
      env,
      vi.fn()
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Audio is required." });
  });

  it("returns 400 for non-audio transcription files", async () => {
    const fetcher = vi.fn();

    const response = await handleKittenVoiceRequest(
      transcriptionRequest("http://127.0.0.1:5173", {
        contentType: "application/pdf",
        content: "%PDF-1.7",
        filename: "notes.pdf"
      }),
      env,
      fetcher
    );

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Audio is required." });
  });

  it("returns 400 for oversized transcription audio", async () => {
    const fetcher = vi.fn();

    const response = await handleKittenVoiceRequest(
      transcriptionRequest("http://127.0.0.1:5173", {
        content: "a".repeat(6 * 1024 * 1024)
      }),
      env,
      fetcher
    );

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Audio is required." });
  });

  it("forwards audio to OpenAI transcription and trims text", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(_input).toBe("https://api.openai.com/v1/audio/transcriptions");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Authorization: "Bearer test-openai-key"
      });
      expect(Object.prototype.toString.call(init?.body)).toBe("[object FormData]");
      const upstreamFormData = init?.body as FormData;
      const file = upstreamFormData.get("file");
      expect(Object.prototype.toString.call(file)).toBe("[object File]");
      expect((file as File).name).toBe("voice.webm");
      expect(await (file as File).text()).toBe("audio-bytes");
      expect(upstreamFormData.get("model")).toBe("gpt-4o-mini-transcribe");
      expect(upstreamFormData.get("language")).toBe("zh");
      return new Response(JSON.stringify({ text: ` ${"我".repeat(180)} ` }), {
        headers: { "Content-Type": "application/json" }
      });
    });

    const response = await handleKittenVoiceRequest(
      transcriptionRequest(),
      env,
      fetcher
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "我".repeat(MAX_TRANSCRIPT_TEXT_LENGTH) });
  });

  it("returns 500 for transcription when voice service is not configured", async () => {
    const fetcher = vi.fn();

    const response = await handleKittenVoiceRequest(
      transcriptionRequest(),
      {},
      fetcher
    );

    expect(response.status).toBe(500);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Voice service is not configured." });
  });

  it("returns 502 when transcription fails", async () => {
    const response = await handleKittenVoiceRequest(
      transcriptionRequest(),
      env,
      vi.fn(async () => new Response("bad upstream", { status: 500 }))
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "AI transcription failed." });
  });

  it("returns 502 when transcription text is empty", async () => {
    const response = await handleKittenVoiceRequest(
      transcriptionRequest(),
      env,
      vi.fn(async () => new Response(JSON.stringify({ text: "   " }), { headers: { "Content-Type": "application/json" } }))
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "AI transcription failed." });
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
      memoryCandidates: [],
      source: "local"
    });
  });

  it("sends child profile and approved memories to OpenAI and returns memory candidates", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(_input).toBe("https://api.openai.com/v1/responses");
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-openai-key");
      const payload = JSON.parse(String(init?.body));
      const inputText = payload.input.map((item: { content: string }) => item.content).join("\n");
      expect(payload.model).toBe("gpt-4.1-mini");
      expect(payload.temperature).toBe(0.7);
      expect(inputText).toContain("你是一只陪孩子写作业的小猫");
      expect(inputText).toContain("不能直接给作业答案");
      expect(inputText).toContain("猫".repeat(MAX_CHAT_MESSAGE_LENGTH));
      expect(inputText).not.toContain("猫".repeat(MAX_CHAT_MESSAGE_LENGTH + 1));
      expect(inputText).toContain(
        JSON.stringify({
          nickname: "小雨",
          gradeBand: "lower-primary",
          favoriteColors: ["粉色"],
          favoriteDecorations: [],
          trickySubjects: ["math"]
        })
      );
      expect(inputText).toContain("小雨做数学口算时容易着急。");
      expect(payload.text.format.schema.required).toEqual(["text", "emotion", "nextAction", "shouldAskAdult", "memoryCandidates"]);
      expect(payload.text.format.schema.properties.memoryCandidates).toEqual({
        type: "array",
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "text", "confidence"],
          properties: {
            kind: { type: "string", enum: ["profile", "preference", "learning", "emotion"] },
            text: { type: "string", maxLength: 80 },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          }
        }
      });

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
                    shouldAskAdult: false,
                    memoryCandidates: [{ kind: "learning", text: "小雨数学口算时容易烦。", confidence: 0.74 }]
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
        trigger: "message",
        childProfile: {
          nickname: "小雨",
          gradeBand: "lower-primary",
          favoriteColors: ["粉色"],
          favoriteDecorations: [],
          trickySubjects: ["math"]
        },
        approvedMemories: [
          { id: "memory-1", kind: "learning", text: "小雨做数学口算时容易着急。" }
        ]
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
      memoryCandidates: [{ kind: "learning", text: "小雨数学口算时容易烦。", confidence: 0.74 }],
      source: "ai"
    });
  });

  it("strips unapproved and nested child profile fields from the OpenAI prompt", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body));
      const inputText = payload.input.map((item: { content: string }) => item.content).join("\n");

      expect(inputText).toContain('"nickname":"小雨"');
      expect(inputText).toContain('"gradeBand":"lower-primary"');
      expect(inputText).toContain('"favoriteColors":["粉色","蓝色"]');
      expect(inputText).toContain('"favoriteDecorations":["星星"]');
      expect(inputText).toContain('"trickySubjects":["math"]');
      expect(inputText).not.toContain("parentPhone");
      expect(inputText).not.toContain("13800138000");
      expect(inputText).not.toContain("homeAddress");
      expect(inputText).not.toContain("medical");
      expect(inputText).not.toContain("passport");

      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    text: "我陪你先读题，找到第一个关键词。",
                    emotion: "coach",
                    nextAction: "圈出关键词",
                    shouldAskAdult: false,
                    memoryCandidates: []
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
        message: "数学有点难",
        childProfile: {
          nickname: "小雨",
          gradeBand: "lower-primary",
          favoriteColors: ["粉色", "蓝色", { homeAddress: "秘密地址" }],
          favoriteDecorations: ["星星"],
          trickySubjects: ["math"],
          parentPhone: "13800138000",
          medical: { allergy: "peanuts" },
          passport: ["G12345678"]
        }
      }),
      env,
      fetcher
    );

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("caps approved memories sent to OpenAI at eight", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body));
      const inputText = payload.input.map((item: { content: string }) => item.content).join("\n");
      expect(inputText).toContain("memory-8 text");
      expect(inputText).not.toContain("memory-9 text");
      expect(inputText).not.toContain("memory-10 text");

      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    text: "我们先读题，再圈出一个关键词。",
                    emotion: "coach",
                    nextAction: "圈出关键词",
                    shouldAskAdult: false,
                    memoryCandidates: []
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
        message: "我不会这题",
        petName: "豆豆",
        approvedMemories: Array.from({ length: 10 }, (_, index) => ({
          id: `memory-${index + 1}`,
          kind: "learning",
          text: `memory-${index + 1} text`
        }))
      }),
      env,
      fetcher
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      text: "我们先读题，再圈出一个关键词。",
      source: "ai"
    });
  });

  it("filters invalid memory candidates and trims valid candidate text", async () => {
    const overlongText = "记".repeat(90);
    const fetcher = vi.fn(async () => new Response(
      JSON.stringify({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  text: "我陪你先做一个小开始。",
                  emotion: "coach",
                  nextAction: "写第一步",
                  shouldAskAdult: false,
                  memoryCandidates: [
                    { kind: "learning", text: overlongText, confidence: 0.9 },
                    { kind: "secret", text: "无效类型不会保存。", confidence: 0.8 },
                    { kind: "emotion", text: "   ", confidence: 0.7 },
                    { kind: "preference", text: "置信度太高不会保存。", confidence: 1.4 }
                  ]
                })
              }
            ]
          }
        ]
      }),
      { headers: { "Content-Type": "application/json" } }
    ));

    const response = await handleKittenVoiceRequest(
      chatRequest({ message: "我不想写", petName: "豆豆" }),
      env,
      fetcher
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      text: "我陪你先做一个小开始。",
      emotion: "coach",
      nextAction: "写第一步",
      shouldAskAdult: false,
      memoryCandidates: [
        { kind: "learning", text: "记".repeat(80), confidence: 0.9 }
      ],
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
      memoryCandidates: [],
      source: "local"
    });
  });
});
