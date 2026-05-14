export const MAX_SPEECH_TEXT_LENGTH = 180;
export const MAX_CHAT_MESSAGE_LENGTH = 120;
export const KITTEN_TTS_INSTRUCTIONS = "用温柔、可爱、鼓励孩子的中文小猫语气说话。语速稍慢，情绪明亮，不要夸张尖叫。";

const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_CHAT_MODEL = "gpt-4.1-mini";
const DEFAULT_ALLOWED_ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173", "https://tata9001.github.io"]);

export interface KittenVoiceEnv {
  OPENAI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  KITTEN_CHAT_MODEL?: string;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function allowedOrigins(env: KittenVoiceEnv): Set<string> {
  const configured = env.ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

function corsHeaders(request: Request, env: KittenVoiceEnv): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";
  const allowOrigin = allowedOrigins(env).has(origin) ? origin : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(request: Request, env: KittenVoiceEnv, status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json"
    }
  });
}

function dataResponse(request: Request, env: KittenVoiceEnv, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function sanitizeSpeechText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Array.from(trimmed).slice(0, MAX_SPEECH_TEXT_LENGTH).join("");
}

async function speechTextFromRequest(request: Request): Promise<string | undefined> {
  try {
    const payload = (await request.json()) as { text?: unknown };
    return sanitizeSpeechText(payload.text);
  } catch {
    return undefined;
  }
}

function sanitizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Array.from(trimmed).slice(0, maxLength).join("");
}

interface KittenChatInput {
  message: string;
  trigger: string;
  petName: string;
  petLevel: number;
  currentTaskName?: string;
}

interface KittenChatResult {
  text: string;
  emotion: "care" | "coach" | "celebrate" | "start";
  nextAction: string;
  shouldAskAdult: boolean;
  source: "ai" | "local";
}

async function chatInputFromRequest(request: Request): Promise<KittenChatInput | undefined> {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const message = sanitizeText(payload.message, MAX_CHAT_MESSAGE_LENGTH);
    if (!message) return undefined;
    const trigger = sanitizeText(payload.trigger, 30) ?? "message";
    const petName = sanitizeText(payload.petName, 12) ?? "小奶糖";
    const petLevel = typeof payload.petLevel === "number" && Number.isFinite(payload.petLevel) ? Math.max(1, Math.floor(payload.petLevel)) : 1;
    const currentTaskName = sanitizeText(payload.currentTaskName, 40);
    return { message, trigger, petName, petLevel, currentTaskName };
  } catch {
    return undefined;
  }
}

function isUnsafeChildMessage(message: string): boolean {
  return /不想活|想死|自杀|伤害自己|打我|害怕回家|没人救|救救我/.test(message);
}

function localAdultEscalation(input: Pick<KittenChatInput, "petName">): KittenChatResult {
  return {
    text: `这听起来有点重要，${input.petName}想让你找爸爸妈妈或老师一起说。你不用一个人扛着。`,
    emotion: "care",
    nextAction: "找爸爸妈妈或老师一起说",
    shouldAskAdult: true,
    source: "local"
  };
}

function localChatFallback(input: Pick<KittenChatInput, "petName" | "message">): KittenChatResult {
  if (/写完|完成|做好|做完/.test(input.message)) {
    return {
      text: `${input.petName}看见你完成了，这不是一下子变出来的，是你一步一步坚持出来的。`,
      emotion: "celebrate",
      nextAction: "把完成的任务打勾",
      shouldAskAdult: false,
      source: "local"
    };
  }

  if (/不想|烦|累|讨厌/.test(input.message)) {
    return {
      text: `${input.petName}听见你有点不想写。我们不做全部，只先把作业本打开，做一个很小的开始。`,
      emotion: "care",
      nextAction: "打开作业本",
      shouldAskAdult: false,
      source: "local"
    };
  }

  return {
    text: `${input.petName}听见你了。我们先不求答案，先把题目读一遍，圈出最关键的一个词。`,
    emotion: "coach",
    nextAction: "圈出题目关键词",
    shouldAskAdult: false,
    source: "local"
  };
}

function chatJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["text", "emotion", "nextAction", "shouldAskAdult"],
    properties: {
      text: { type: "string", maxLength: 120 },
      emotion: { type: "string", enum: ["care", "coach", "celebrate", "start"] },
      nextAction: { type: "string", maxLength: 40 },
      shouldAskAdult: { type: "boolean" }
    }
  };
}

function buildChatPrompt(input: KittenChatInput): string {
  return [
    `小猫名字：${input.petName}`,
    `小猫等级：${input.petLevel}`,
    `当前任务：${input.currentTaskName ?? "未知"}`,
    `触发方式：${input.trigger}`,
    `孩子说：${input.message}`,
    "请输出 JSON。"
  ].join("\n");
}

function parseOpenAIChatResult(value: unknown): Omit<KittenChatResult, "source"> | undefined {
  const output = (value as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }).output;
  const text = output?.flatMap((item) => item.content ?? []).find((content) => content.type === "output_text")?.text;
  if (!text) return undefined;

  try {
    const parsed = JSON.parse(text) as Partial<Omit<KittenChatResult, "source">>;
    if (
      typeof parsed.text === "string" &&
      typeof parsed.nextAction === "string" &&
      typeof parsed.shouldAskAdult === "boolean" &&
      (parsed.emotion === "care" || parsed.emotion === "coach" || parsed.emotion === "celebrate" || parsed.emotion === "start")
    ) {
      return {
        text: Array.from(parsed.text.trim()).slice(0, MAX_SPEECH_TEXT_LENGTH).join(""),
        emotion: parsed.emotion,
        nextAction: Array.from(parsed.nextAction.trim()).slice(0, 40).join(""),
        shouldAskAdult: parsed.shouldAskAdult
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function handleKittenChatRequest(request: Request, env: KittenVoiceEnv, fetcher: Fetcher): Promise<Response> {
  const input = await chatInputFromRequest(request);
  if (!input) {
    return jsonResponse(request, env, 400, "Child message is required.");
  }

  if (isUnsafeChildMessage(input.message)) {
    return dataResponse(request, env, localAdultEscalation(input));
  }

  if (!env.OPENAI_API_KEY) {
    return dataResponse(request, env, localChatFallback(input));
  }

  const openAIResponse = await fetcher(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.KITTEN_CHAT_MODEL ?? DEFAULT_CHAT_MODEL,
      temperature: 0.7,
      input: [
        {
          role: "developer",
          content:
            "你是一只陪孩子写作业的小猫，是学习伙伴，不是答案机器。用中文回复 1-2 句，温柔、具体、有陪伴感。不能直接给作业答案，不能写作文或代算题目，只能引导孩子读题、圈关键词、写第一步、短暂休息或找家长老师。遇到危险、强烈痛苦或家庭不安全，要建议找爸爸妈妈或老师。不要假装自己是真人。"
        },
        {
          role: "user",
          content: buildChatPrompt(input)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "kitten_companion_reply",
          strict: true,
          schema: chatJsonSchema()
        }
      }
    })
  });

  if (!openAIResponse.ok) {
    return dataResponse(request, env, localChatFallback(input));
  }

  const parsed = parseOpenAIChatResult(await openAIResponse.json());
  if (!parsed) {
    return dataResponse(request, env, localChatFallback(input));
  }

  return dataResponse(request, env, { ...parsed, source: "ai" });
}

export async function handleKittenVoiceRequest(
  request: Request,
  env: KittenVoiceEnv,
  fetcher: Fetcher = fetch
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request, env)
    });
  }

  const url = new URL(request.url);
  if (request.method !== "POST" || (url.pathname !== "/kitten-speech" && url.pathname !== "/kitten-chat")) {
    return jsonResponse(request, env, 404, "Not found.");
  }

  if (url.pathname === "/kitten-chat") {
    return handleKittenChatRequest(request, env, fetcher);
  }

  const input = await speechTextFromRequest(request);
  if (!input) {
    return jsonResponse(request, env, 400, "Speech text is required.");
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResponse(request, env, 500, "Voice service is not configured.");
  }

  const openAIResponse = await fetcher(OPENAI_SPEECH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input,
      instructions: KITTEN_TTS_INSTRUCTIONS
    })
  });

  if (!openAIResponse.ok) {
    return jsonResponse(request, env, 502, "AI voice generation failed.");
  }

  return new Response(openAIResponse.body, {
    status: 200,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": openAIResponse.headers.get("Content-Type") ?? "audio/mpeg",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  fetch(request: Request, env: KittenVoiceEnv): Promise<Response> {
    return handleKittenVoiceRequest(request, env);
  }
};
