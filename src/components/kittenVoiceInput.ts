export type KittenTranscriptionResult = { ok: true; text: string } | { ok: false };

export const MIN_TRANSCRIPTION_AUDIO_BYTES = 256;

export interface KittenTranscriptionOptions {
  voiceApiUrl?: string;
  transcribeApiUrl?: string;
  fetcher?: typeof fetch;
}

export function resolveKittenTranscribeApiUrl(
  voiceApiUrl = import.meta.env.VITE_KITTEN_VOICE_API_URL,
  transcribeApiUrl?: string
): string | undefined {
  const configuredTranscribeUrl = transcribeApiUrl?.trim();
  if (configuredTranscribeUrl) return configuredTranscribeUrl;

  const configuredVoiceUrl = voiceApiUrl?.trim();
  if (!configuredVoiceUrl) return undefined;

  try {
    const url = new URL(configuredVoiceUrl);
    url.pathname = url.pathname.replace(/\/?[^/]*$/, "/kitten-transcribe");
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function transcribeKittenAudio(blob: Blob, options: KittenTranscriptionOptions = {}): Promise<KittenTranscriptionResult> {
  const transcribeApiUrl = resolveKittenTranscribeApiUrl(options.voiceApiUrl, options.transcribeApiUrl);
  if (!transcribeApiUrl || blob.size < MIN_TRANSCRIPTION_AUDIO_BYTES) return { ok: false };

  try {
    const body = new FormData();
    body.set("audio", blob, "kitten-voice.webm");

    const response = await (options.fetcher ?? fetch)(transcribeApiUrl, {
      method: "POST",
      body
    });
    if (!response.ok) return { ok: false };

    const payload = (await response.json()) as { text?: unknown };
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    return text ? { ok: true, text } : { ok: false };
  } catch {
    return { ok: false };
  }
}
