export type KittenCompanionEmotion = "care" | "coach" | "celebrate" | "start";
export type KittenCompanionSource = "ai" | "local";

export interface KittenCompanionRequest {
  message: string;
  trigger: string;
  petName: string;
  petLevel: number;
  currentTaskName?: string;
}

export interface KittenCompanionReply {
  text: string;
  emotion: KittenCompanionEmotion;
  nextAction: string;
  shouldAskAdult: boolean;
  source: KittenCompanionSource;
}

export type KittenCompanionResult = { ok: true; reply: KittenCompanionReply } | { ok: false };

export interface KittenCompanionOptions {
  voiceApiUrl?: string;
  chatApiUrl?: string;
  fetcher?: typeof fetch;
}

export function resolveKittenChatApiUrl(voiceApiUrl = import.meta.env.VITE_KITTEN_VOICE_API_URL, chatApiUrl?: string): string | undefined {
  const configuredChatUrl = chatApiUrl?.trim();
  if (configuredChatUrl) return configuredChatUrl;

  const configuredVoiceUrl = voiceApiUrl?.trim();
  if (!configuredVoiceUrl) return undefined;

  try {
    const url = new URL(configuredVoiceUrl);
    url.pathname = url.pathname.replace(/\/?[^/]*$/, "/kitten-chat");
    return url.toString();
  } catch {
    return undefined;
  }
}

function isKittenCompanionReply(value: unknown): value is KittenCompanionReply {
  const reply = value as Partial<KittenCompanionReply>;
  return (
    typeof reply.text === "string" &&
    typeof reply.nextAction === "string" &&
    typeof reply.shouldAskAdult === "boolean" &&
    (reply.emotion === "care" || reply.emotion === "coach" || reply.emotion === "celebrate" || reply.emotion === "start") &&
    (reply.source === "ai" || reply.source === "local")
  );
}

export async function askKittenCompanion(
  request: KittenCompanionRequest,
  options: KittenCompanionOptions = {}
): Promise<KittenCompanionResult> {
  const chatApiUrl = resolveKittenChatApiUrl(options.voiceApiUrl, options.chatApiUrl);
  if (!chatApiUrl) return { ok: false };

  try {
    const response = await (options.fetcher ?? fetch)(chatApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    if (!response.ok) return { ok: false };

    const reply = await response.json();
    return isKittenCompanionReply(reply) ? { ok: true, reply } : { ok: false };
  } catch {
    return { ok: false };
  }
}
