export const MAX_SPEECH_TEXT_LENGTH = 180;
export const KITTEN_TTS_INSTRUCTIONS = "用温柔、可爱、鼓励孩子的中文小猫语气说话。语速稍慢，情绪明亮，不要夸张尖叫。";

const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";
const DEFAULT_ALLOWED_ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173", "https://tata9001.github.io"]);

export interface KittenVoiceEnv {
  OPENAI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
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
  if (request.method !== "POST" || url.pathname !== "/kitten-speech") {
    return jsonResponse(request, env, 404, "Not found.");
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
