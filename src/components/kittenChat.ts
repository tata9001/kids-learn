import type { ApprovedKittenMemory, ChildCompanionProfile, KittenMemoryKind } from "../domain/types";

export type KittenCompanionEmotion = "care" | "coach" | "celebrate" | "start";
export type KittenCompanionSource = "ai" | "local";

export interface KittenMemoryCandidateReply {
  kind: KittenMemoryKind;
  text: string;
  confidence: number;
}

export interface KittenCompanionRequest {
  message: string;
  trigger: string;
  petName: string;
  petLevel: number;
  currentTaskName?: string;
  childProfile?: Partial<ChildCompanionProfile>;
  approvedMemories?: Pick<ApprovedKittenMemory, "id" | "kind" | "text">[];
}

export interface KittenCompanionReply {
  text: string;
  emotion: KittenCompanionEmotion;
  nextAction: string;
  shouldAskAdult: boolean;
  source: KittenCompanionSource;
  memoryCandidates: KittenMemoryCandidateReply[];
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

function isKittenMemoryCandidateReply(value: unknown): value is KittenMemoryCandidateReply {
  const candidate = value as Partial<KittenMemoryCandidateReply>;
  return (
    (candidate.kind === "profile" || candidate.kind === "preference" || candidate.kind === "learning" || candidate.kind === "emotion") &&
    typeof candidate.text === "string" &&
    typeof candidate.confidence === "number" &&
    Number.isFinite(candidate.confidence) &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1
  );
}

function normalizeKittenCompanionReply(value: unknown): KittenCompanionReply | undefined {
  const reply = value as Partial<KittenCompanionReply>;
  const memoryCandidates = reply.memoryCandidates ?? [];
  if (
    typeof reply.text === "string" &&
    typeof reply.nextAction === "string" &&
    typeof reply.shouldAskAdult === "boolean" &&
    (reply.emotion === "care" || reply.emotion === "coach" || reply.emotion === "celebrate" || reply.emotion === "start") &&
    (reply.source === "ai" || reply.source === "local") &&
    Array.isArray(memoryCandidates) &&
    memoryCandidates.every(isKittenMemoryCandidateReply)
  ) {
    return {
      text: reply.text,
      emotion: reply.emotion,
      nextAction: reply.nextAction,
      shouldAskAdult: reply.shouldAskAdult,
      source: reply.source,
      memoryCandidates
    };
  }

  return undefined;
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

    const reply = normalizeKittenCompanionReply(await response.json());
    return reply ? { ok: true, reply } : { ok: false };
  } catch {
    return { ok: false };
  }
}
