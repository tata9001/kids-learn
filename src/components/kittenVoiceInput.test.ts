import { describe, expect, it, vi } from "vitest";
import { resolveKittenTranscribeApiUrl, transcribeKittenAudio } from "./kittenVoiceInput";

describe("kitten voice input", () => {
  it("derives the transcription endpoint from the speech endpoint", () => {
    expect(resolveKittenTranscribeApiUrl("https://voice.example.com/kitten-speech")).toBe("https://voice.example.com/kitten-transcribe");
    expect(resolveKittenTranscribeApiUrl("")).toBeUndefined();
    expect(resolveKittenTranscribeApiUrl("not a url")).toBeUndefined();
  });

  it("uses an explicit transcription endpoint when provided", () => {
    expect(resolveKittenTranscribeApiUrl("https://voice.example.com/kitten-speech", " https://api.example.com/transcribe ")).toBe(
      "https://api.example.com/transcribe"
    );
  });

  it("posts recorded audio to the transcription endpoint", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe("https://voice.example.com/kitten-transcribe");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      expect((init?.body as FormData).get("audio")).toBeInstanceOf(Blob);
      return new Response(JSON.stringify({ text: " 我不会这道题 " }), {
        headers: { "Content-Type": "application/json" }
      });
    });

    await expect(
      transcribeKittenAudio(new Blob(["voice".repeat(80)], { type: "audio/webm" }), {
        voiceApiUrl: "https://voice.example.com/kitten-speech",
        fetcher
      })
    ).resolves.toEqual({ ok: true, text: "我不会这道题" });
  });

  it("returns failure for missing endpoint or tiny audio", async () => {
    await expect(transcribeKittenAudio(new Blob(["voice".repeat(80)], { type: "audio/webm" }), { voiceApiUrl: "" })).resolves.toEqual({ ok: false });
    await expect(transcribeKittenAudio(new Blob([], { type: "audio/webm" }), { voiceApiUrl: "https://voice.example.com/kitten-speech" })).resolves.toEqual({
      ok: false
    });
    await expect(transcribeKittenAudio(new Blob(["x"], { type: "audio/webm" }), { voiceApiUrl: "https://voice.example.com/kitten-speech" })).resolves.toEqual({
      ok: false
    });
  });

  it("returns failure for fetch failures, non-ok responses, and malformed payloads", async () => {
    await expect(
      transcribeKittenAudio(new Blob(["voice".repeat(80)], { type: "audio/webm" }), {
        voiceApiUrl: "https://voice.example.com/kitten-speech",
        fetcher: vi.fn(async () => {
          throw new Error("network down");
        })
      })
    ).resolves.toEqual({ ok: false });

    await expect(
      transcribeKittenAudio(new Blob(["voice".repeat(80)], { type: "audio/webm" }), {
        voiceApiUrl: "https://voice.example.com/kitten-speech",
        fetcher: vi.fn(async () => new Response(JSON.stringify({ text: "hello" }), { status: 500 }))
      })
    ).resolves.toEqual({ ok: false });

    await expect(
      transcribeKittenAudio(new Blob(["voice".repeat(80)], { type: "audio/webm" }), {
        voiceApiUrl: "https://voice.example.com/kitten-speech",
        fetcher: vi.fn(async () => new Response(JSON.stringify({ text: "  " })))
      })
    ).resolves.toEqual({ ok: false });
  });
});
