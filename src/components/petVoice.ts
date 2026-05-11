export type KittenVoiceResult = "ai" | "local" | "silent";

interface PlayableAudio {
  play(): Promise<void> | void;
}

export interface KittenVoiceOptions {
  voiceApiUrl?: string;
  fetcher?: typeof fetch;
  audioFactory?: (url: string) => PlayableAudio;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

export function isAiKittenVoiceConfigured(voiceApiUrl = import.meta.env.VITE_KITTEN_VOICE_API_URL): boolean {
  return Boolean(voiceApiUrl?.trim());
}

function speakLocalKittenLine(text: string): boolean {
  const line = text.trim();
  if (!line || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;

  const utterance = new SpeechSynthesisUtterance(line);
  utterance.lang = "zh-CN";
  utterance.rate = 0.92;
  utterance.pitch = 1.28;
  utterance.volume = 0.95;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

async function speakAiKittenLine(text: string, options: KittenVoiceOptions & { voiceApiUrl: string }): Promise<boolean> {
  const fetcher = options.fetcher ?? fetch;
  const audioFactory = options.audioFactory ?? ((url: string) => new Audio(url));
  const createObjectURL = options.createObjectURL ?? URL.createObjectURL?.bind(URL);
  const revokeObjectURL = options.revokeObjectURL ?? URL.revokeObjectURL?.bind(URL);
  if (!createObjectURL || !revokeObjectURL) return false;

  const response = await fetcher(options.voiceApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!response.ok) return false;

  const blob = await response.blob();
  if (!blob.type.startsWith("audio/")) return false;

  const objectUrl = createObjectURL(blob);
  try {
    await audioFactory(objectUrl).play();
    return true;
  } finally {
    revokeObjectURL(objectUrl);
  }
}

export async function speakKittenLine(text: string, options: KittenVoiceOptions = {}): Promise<KittenVoiceResult> {
  const line = text.trim();
  if (!line) return "silent";

  const voiceApiUrl = options.voiceApiUrl ?? import.meta.env.VITE_KITTEN_VOICE_API_URL ?? "";
  if (isAiKittenVoiceConfigured(voiceApiUrl)) {
    try {
      if (await speakAiKittenLine(line, { ...options, voiceApiUrl })) return "ai";
    } catch (error) {
      console.warn("AI kitten voice failed; falling back to local voice.", error);
    }
  }

  return speakLocalKittenLine(line) ? "local" : "silent";
}
