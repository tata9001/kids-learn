import { describe, expect, it, vi } from "vitest";
import { askKittenCompanion, resolveKittenChatApiUrl } from "./kittenChat";

describe("kitten chat client", () => {
  it("derives the chat endpoint from the configured speech endpoint", () => {
    expect(resolveKittenChatApiUrl("https://voice.example.com/kitten-speech")).toBe("https://voice.example.com/kitten-chat");
    expect(resolveKittenChatApiUrl("https://voice.example.com/custom")).toBe("https://voice.example.com/kitten-chat");
    expect(resolveKittenChatApiUrl("")).toBeUndefined();
  });

  it("posts child context to the kitten chat endpoint", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(_input).toBe("https://voice.example.com/kitten-chat");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(String(init?.body))).toEqual({
        message: "我不会这题",
        trigger: "message",
        petName: "豆豆",
        petLevel: 3,
        currentTaskName: "数学口算",
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
      });

      return new Response(
        JSON.stringify({
          text: "我听见你卡住了。先圈出关键词，我陪你看第一步。",
          emotion: "coach",
          nextAction: "圈出关键词",
          shouldAskAdult: false,
          source: "ai",
          memoryCandidates: [{ kind: "learning", text: "小雨数学口算时容易烦。", confidence: 0.74 }]
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await askKittenCompanion(
      {
        message: "我不会这题",
        trigger: "message",
        petName: "豆豆",
        petLevel: 3,
        currentTaskName: "数学口算",
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
      },
      {
        voiceApiUrl: "https://voice.example.com/kitten-speech",
        fetcher
      }
    );

    expect(result).toEqual({
      ok: true,
      reply: {
        text: "我听见你卡住了。先圈出关键词，我陪你看第一步。",
        emotion: "coach",
        nextAction: "圈出关键词",
        shouldAskAdult: false,
        source: "ai",
        memoryCandidates: [{ kind: "learning", text: "小雨数学口算时容易烦。", confidence: 0.74 }]
      }
    });
  });

  it("defaults missing memory candidates to an empty list", async () => {
    const result = await askKittenCompanion(
      {
        message: "我不会这题",
        trigger: "message",
        petName: "豆豆",
        petLevel: 3
      },
      {
        voiceApiUrl: "https://voice.example.com/kitten-speech",
        fetcher: vi.fn(async () => new Response(
          JSON.stringify({
            text: "我陪你先看第一步。",
            emotion: "coach",
            nextAction: "圈出关键词",
            shouldAskAdult: false,
            source: "ai"
          }),
          { headers: { "Content-Type": "application/json" } }
        ))
      }
    );

    expect(result).toEqual({
      ok: true,
      reply: {
        text: "我陪你先看第一步。",
        emotion: "coach",
        nextAction: "圈出关键词",
        shouldAskAdult: false,
        source: "ai",
        memoryCandidates: []
      }
    });
  });

  it("returns a failure when the endpoint is missing or unavailable", async () => {
    await expect(askKittenCompanion({ message: "我不会", trigger: "message", petName: "豆豆", petLevel: 1 }, { voiceApiUrl: "" })).resolves.toEqual({
      ok: false
    });

    await expect(
      askKittenCompanion(
        { message: "我不会", trigger: "message", petName: "豆豆", petLevel: 1 },
        {
          voiceApiUrl: "https://voice.example.com/kitten-speech",
          fetcher: vi.fn(async () => new Response(JSON.stringify({ error: "bad" }), { status: 500 }))
        }
      )
    ).resolves.toEqual({ ok: false });
  });
});
