# Voice Memory Kitten Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add push-to-talk voice conversation and parent-approved child memory so the kitten can become a more personal learning companion.

**Architecture:** Extend the existing Cloudflare Worker with `/kitten-transcribe` and richer `/kitten-chat` structured output. Add typed local child-profile and memory state to `StudyState`, expose focused store actions, add a browser recording/transcription client, and upgrade `PetPanel` plus parent mode to support voice conversation and memory review while keeping local fallback behavior.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Cloudflare Workers, OpenAI audio transcription, existing OpenAI Responses API chat, existing AI TTS path.

---

## File Structure

- `workers/kitten-voice/src/index.ts`: add `/kitten-transcribe`; extend `/kitten-chat` input/output with profile, approved memories, and memory candidates.
- `workers/kitten-voice/src/index.test.ts`: Worker TDD coverage for transcription, profile-aware chat, memory candidates, and safety behavior.
- `src/domain/types.ts`: add child profile, memory candidate, approved memory, and voice companion state types.
- `src/domain/defaultState.ts`: initialize profile and memory state.
- `src/storage/localStore.ts`: normalize migrated state to include new profile/memory fields without bumping old data out.
- `src/domain/kittenMemory.ts`: pure helpers for profile updates, candidate filtering, candidate approval/edit/reject/delete/clear.
- `src/domain/kittenMemory.test.ts`: domain tests for memory lifecycle and sensitive-content filtering.
- `src/state/useStudyStore.tsx`: expose actions for memory and profile management.
- `src/components/kittenChat.ts`: include profile and memories in chat requests and parse memory candidates.
- `src/components/kittenChat.test.ts`: client tests for enriched payloads and response parsing.
- `src/components/kittenVoiceInput.ts`: browser `MediaRecorder` helper and transcription client.
- `src/components/kittenVoiceInput.test.ts`: tests for endpoint derivation, transcription posting, short-audio guard, and failure results.
- `src/components/PetPanel.tsx`: add push-to-talk UI states and memory candidate handling.
- `src/components/ParentDashboard.tsx`: add `小猫记忆` management section.
- `src/App.test.tsx`: integration coverage for voice fallback UI and parent approval flow.
- `src/styles.css`: styles for voice states and memory-management UI.

---

### Task 1: Worker Transcription Endpoint

**Files:**
- Modify: `workers/kitten-voice/src/index.ts`
- Test: `workers/kitten-voice/src/index.test.ts`

- [ ] **Step 1: Write failing Worker tests**

Add tests to `workers/kitten-voice/src/index.test.ts`:

```ts
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

it("forwards audio to OpenAI transcription and trims text", async () => {
  const formData = new FormData();
  formData.set("audio", new Blob(["audio-bytes"], { type: "audio/webm" }), "voice.webm");
  const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    expect(_input).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-openai-key");
    expect(init?.body).toBeInstanceOf(FormData);
    return new Response(JSON.stringify({ text: ` ${"我".repeat(180)} ` }), {
      headers: { "Content-Type": "application/json" }
    });
  });

  const response = await handleKittenVoiceRequest(
    new Request("https://voice.example.com/kitten-transcribe", {
      method: "POST",
      headers: { Origin: "http://127.0.0.1:5173" },
      body: formData
    }),
    env,
    fetcher
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ text: "我".repeat(160) });
});

it("returns 502 when transcription fails", async () => {
  const formData = new FormData();
  formData.set("audio", new Blob(["audio-bytes"], { type: "audio/webm" }), "voice.webm");
  const response = await handleKittenVoiceRequest(
    new Request("https://voice.example.com/kitten-transcribe", {
      method: "POST",
      headers: { Origin: "http://127.0.0.1:5173" },
      body: formData
    }),
    env,
    vi.fn(async () => new Response("bad upstream", { status: 500 }))
  );

  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: "AI transcription failed." });
});
```

- [ ] **Step 2: Run failing Worker tests**

Run:

```bash
npm test -- workers/kitten-voice/src/index.test.ts
```

Expected: the new transcription tests fail because `/kitten-transcribe` returns `404`.

- [ ] **Step 3: Implement `/kitten-transcribe`**

In `workers/kitten-voice/src/index.ts`, add:

```ts
export const MAX_TRANSCRIPT_TEXT_LENGTH = 160;
const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";

function sanitizeTranscriptText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Array.from(trimmed).slice(0, MAX_TRANSCRIPT_TEXT_LENGTH).join("");
}

async function audioFromRequest(request: Request): Promise<File | undefined> {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    return audio instanceof File && audio.size > 0 ? audio : undefined;
  } catch {
    return undefined;
  }
}

async function handleKittenTranscribeRequest(request: Request, env: KittenVoiceEnv, fetcher: Fetcher): Promise<Response> {
  const audio = await audioFromRequest(request);
  if (!audio) return jsonResponse(request, env, 400, "Audio is required.");
  if (!env.OPENAI_API_KEY) return jsonResponse(request, env, 500, "Voice service is not configured.");

  const body = new FormData();
  body.set("file", audio, audio.name || "kitten-voice.webm");
  body.set("model", "gpt-4o-mini-transcribe");
  body.set("language", "zh");

  const openAIResponse = await fetcher(OPENAI_TRANSCRIPTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body
  });
  if (!openAIResponse.ok) return jsonResponse(request, env, 502, "AI transcription failed.");

  const transcript = sanitizeTranscriptText(((await openAIResponse.json()) as { text?: unknown }).text);
  if (!transcript) return jsonResponse(request, env, 502, "AI transcription failed.");
  return dataResponse(request, env, { text: transcript });
}
```

Update route matching to allow `/kitten-transcribe` and dispatch it before speech handling.

- [ ] **Step 4: Run Worker tests**

Run:

```bash
npm test -- workers/kitten-voice/src/index.test.ts
```

Expected: Worker tests pass.

### Task 2: Profile And Memory Domain

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/defaultState.ts`
- Modify: `src/storage/localStore.ts`
- Create: `src/domain/kittenMemory.ts`
- Test: `src/domain/kittenMemory.test.ts`

- [ ] **Step 1: Write failing domain tests**

Create `src/domain/kittenMemory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultState } from "./defaultState";
import {
  addKittenMemoryCandidates,
  approveKittenMemoryCandidate,
  clearKittenMemories,
  deleteKittenMemory,
  rejectKittenMemoryCandidate,
  updateChildCompanionProfile
} from "./kittenMemory";

describe("kitten memory", () => {
  it("updates child companion profile without losing study state", () => {
    const state = createDefaultState();
    const next = updateChildCompanionProfile(state, {
      nickname: "小雨",
      gradeBand: "lower-primary",
      preferredAddress: "小雨",
      encouragementStyle: "先鼓励再给一步"
    });

    expect(next.tasks).toBe(state.tasks);
    expect(next.childCompanionProfile).toMatchObject({
      nickname: "小雨",
      gradeBand: "lower-primary",
      preferredAddress: "小雨",
      encouragementStyle: "先鼓励再给一步"
    });
  });

  it("adds safe pending memory candidates and filters sensitive candidates", () => {
    const next = addKittenMemoryCandidates(
      createDefaultState(),
      [
        { kind: "learning", text: "小雨做数学口算时容易着急，先圈关键词会更稳。", confidence: 0.84 },
        { kind: "profile", text: "小雨的电话是 13800138000。", confidence: 0.9 }
      ],
      "2026-05-15T09:00:00+08:00"
    );

    expect(next.pendingKittenMemoryCandidates).toHaveLength(1);
    expect(next.pendingKittenMemoryCandidates[0]).toMatchObject({
      kind: "learning",
      status: "pending-parent",
      text: "小雨做数学口算时容易着急，先圈关键词会更稳。"
    });
  });

  it("lets parents approve, reject, delete, and clear memories", () => {
    const withCandidates = addKittenMemoryCandidates(
      createDefaultState(),
      [{ kind: "preference", text: "小雨喜欢粉色蝴蝶结。", confidence: 0.82 }],
      "2026-05-15T09:00:00+08:00"
    );
    const candidateId = withCandidates.pendingKittenMemoryCandidates[0].id;
    const approved = approveKittenMemoryCandidate(withCandidates, candidateId, "小雨喜欢粉色蝴蝶结。", "2026-05-15T09:05:00+08:00");

    expect(approved.pendingKittenMemoryCandidates).toHaveLength(0);
    expect(approved.approvedKittenMemories).toHaveLength(1);

    const deleted = deleteKittenMemory(approved, approved.approvedKittenMemories[0].id);
    expect(deleted.approvedKittenMemories).toHaveLength(0);

    const rejected = rejectKittenMemoryCandidate(withCandidates, candidateId);
    expect(rejected.pendingKittenMemoryCandidates).toHaveLength(0);

    const cleared = clearKittenMemories(approved);
    expect(cleared.approvedKittenMemories).toHaveLength(0);
    expect(cleared.pendingKittenMemoryCandidates).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run failing domain tests**

Run:

```bash
npm test -- src/domain/kittenMemory.test.ts
```

Expected: fails because `kittenMemory.ts` and new state fields do not exist.

- [ ] **Step 3: Add types and defaults**

In `src/domain/types.ts`, add:

```ts
export type GradeBand = "preschool" | "lower-primary" | "upper-primary" | "unknown";
export type KittenMemoryKind = "profile" | "preference" | "learning" | "emotion";
export type KittenMemorySource = "ai-candidate" | "child-confirmed" | "parent";

export interface ChildCompanionProfile {
  nickname?: string;
  gradeBand: GradeBand;
  preferredAddress?: string;
  favoriteColors: string[];
  favoriteDecorations: string[];
  encouragementStyle?: string;
  trickySubjects: Subject[];
  frustrationSupport?: string;
  recentLearningState?: string;
}

export interface KittenMemoryCandidate {
  id: string;
  kind: KittenMemoryKind;
  text: string;
  confidence: number;
  createdAt: string;
  status: "pending-parent";
}

export interface ApprovedKittenMemory {
  id: string;
  kind: KittenMemoryKind;
  text: string;
  createdAt: string;
  approvedAt: string;
  source: KittenMemorySource;
}
```

Add to `StudyState`:

```ts
childCompanionProfile: ChildCompanionProfile;
pendingKittenMemoryCandidates: KittenMemoryCandidate[];
approvedKittenMemories: ApprovedKittenMemory[];
```

In `src/domain/defaultState.ts`, initialize those fields:

```ts
childCompanionProfile: {
  gradeBand: "unknown",
  favoriteColors: [],
  favoriteDecorations: [],
  trickySubjects: []
},
pendingKittenMemoryCandidates: [],
approvedKittenMemories: [],
```

In `src/storage/localStore.ts`, make version-2 migration normalize missing fields:

```ts
function normalizeStudyState(state: StudyState): StudyState {
  const defaults = createDefaultState();
  return {
    ...state,
    childCompanionProfile: {
      ...defaults.childCompanionProfile,
      ...state.childCompanionProfile,
      favoriteColors: state.childCompanionProfile?.favoriteColors ?? [],
      favoriteDecorations: state.childCompanionProfile?.favoriteDecorations ?? [],
      trickySubjects: state.childCompanionProfile?.trickySubjects ?? []
    },
    pendingKittenMemoryCandidates: state.pendingKittenMemoryCandidates ?? [],
    approvedKittenMemories: state.approvedKittenMemories ?? [],
    pet: normalizePet(state.pet)
  };
}
```

Use `normalizeStudyState(value)` in the version-2 branch.

- [ ] **Step 4: Implement memory helpers**

Create `src/domain/kittenMemory.ts`:

```ts
import type { ApprovedKittenMemory, ChildCompanionProfile, KittenMemoryCandidate, KittenMemoryKind, StudyState } from "./types";

export type NewKittenMemoryCandidate = Pick<KittenMemoryCandidate, "kind" | "text" | "confidence">;

const SENSITIVE_PATTERNS = [/\\d{11}/, /电话|手机号|住址|地址|身份证|学校全名|医院|诊断|不要告诉/];

function sanitizeMemoryText(text: string): string | undefined {
  const trimmed = Array.from(text.trim()).slice(0, 80).join("");
  if (!trimmed) return undefined;
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(trimmed))) return undefined;
  return trimmed;
}

function sanitizeShortText(text: string | undefined, maxLength = 24): string | undefined {
  if (!text) return undefined;
  const trimmed = Array.from(text.trim()).slice(0, maxLength).join("");
  return trimmed || undefined;
}

function sanitizeTextList(values: string[] | undefined, maxItems = 5): string[] {
  return (values ?? []).map((value) => sanitizeShortText(value, 16)).filter((value): value is string => Boolean(value)).slice(0, maxItems);
}

export function updateChildCompanionProfile(state: StudyState, input: Partial<ChildCompanionProfile>): StudyState {
  return {
    ...state,
    childCompanionProfile: {
      ...state.childCompanionProfile,
      ...input,
      nickname: sanitizeShortText(input.nickname) ?? state.childCompanionProfile.nickname,
      preferredAddress: sanitizeShortText(input.preferredAddress) ?? state.childCompanionProfile.preferredAddress,
      favoriteColors: input.favoriteColors ? sanitizeTextList(input.favoriteColors) : state.childCompanionProfile.favoriteColors,
      favoriteDecorations: input.favoriteDecorations
        ? sanitizeTextList(input.favoriteDecorations)
        : state.childCompanionProfile.favoriteDecorations,
      encouragementStyle: sanitizeShortText(input.encouragementStyle, 40) ?? state.childCompanionProfile.encouragementStyle,
      frustrationSupport: sanitizeShortText(input.frustrationSupport, 40) ?? state.childCompanionProfile.frustrationSupport,
      recentLearningState: sanitizeShortText(input.recentLearningState, 60) ?? state.childCompanionProfile.recentLearningState,
      trickySubjects: input.trickySubjects ?? state.childCompanionProfile.trickySubjects
    }
  };
}

export function addKittenMemoryCandidates(state: StudyState, candidates: NewKittenMemoryCandidate[], createdAt: string): StudyState {
  const nextCandidates = candidates
    .map((candidate, index) => {
      const text = sanitizeMemoryText(candidate.text);
      if (!text) return undefined;
      return {
        id: `candidate-${createdAt}-${index}`,
        kind: candidate.kind,
        text,
        confidence: Math.max(0, Math.min(1, candidate.confidence)),
        createdAt,
        status: "pending-parent" as const
      };
    })
    .filter((candidate): candidate is KittenMemoryCandidate => Boolean(candidate));

  return {
    ...state,
    pendingKittenMemoryCandidates: [...state.pendingKittenMemoryCandidates, ...nextCandidates].slice(-20)
  };
}

export function approveKittenMemoryCandidate(state: StudyState, candidateId: string, text: string, approvedAt: string): StudyState {
  const candidate = state.pendingKittenMemoryCandidates.find((item) => item.id === candidateId);
  const sanitizedText = sanitizeMemoryText(text);
  if (!candidate || !sanitizedText) return state;

  const memory: ApprovedKittenMemory = {
    id: `memory-${candidate.id}`,
    kind: candidate.kind,
    text: sanitizedText,
    createdAt: candidate.createdAt,
    approvedAt,
    source: "ai-candidate"
  };

  return {
    ...state,
    pendingKittenMemoryCandidates: state.pendingKittenMemoryCandidates.filter((item) => item.id !== candidateId),
    approvedKittenMemories: [...state.approvedKittenMemories, memory].slice(-30)
  };
}

export function rejectKittenMemoryCandidate(state: StudyState, candidateId: string): StudyState {
  return {
    ...state,
    pendingKittenMemoryCandidates: state.pendingKittenMemoryCandidates.filter((item) => item.id !== candidateId)
  };
}

export function deleteKittenMemory(state: StudyState, memoryId: string): StudyState {
  return {
    ...state,
    approvedKittenMemories: state.approvedKittenMemories.filter((item) => item.id !== memoryId)
  };
}

export function clearKittenMemories(state: StudyState): StudyState {
  return {
    ...state,
    pendingKittenMemoryCandidates: [],
    approvedKittenMemories: []
  };
}
```

- [ ] **Step 5: Run domain tests**

Run:

```bash
npm test -- src/domain/kittenMemory.test.ts src/storage/localStore.test.ts src/domain/defaultState.test.ts
```

Expected: tests pass.

### Task 3: Enriched Chat Contract

**Files:**
- Modify: `workers/kitten-voice/src/index.ts`
- Modify: `workers/kitten-voice/src/index.test.ts`
- Modify: `src/components/kittenChat.ts`
- Modify: `src/components/kittenChat.test.ts`

- [ ] **Step 1: Write failing enriched chat tests**

In Worker tests, add a `/kitten-chat` test that sends `childProfile` and `approvedMemories`, then asserts the OpenAI payload includes profile and memory text and parses `memoryCandidates`.

In `src/components/kittenChat.test.ts`, update the existing POST-body expectation:

```ts
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
    {
      id: "memory-1",
      kind: "learning",
      text: "小雨做数学口算时容易着急。"
    }
  ]
});
```

Expect the parsed reply to include:

```ts
memoryCandidates: [{ kind: "learning", text: "小雨数学口算时容易烦。", confidence: 0.74 }]
```

- [ ] **Step 2: Run failing chat tests**

Run:

```bash
npm test -- workers/kitten-voice/src/index.test.ts src/components/kittenChat.test.ts
```

Expected: fails because memory candidates are not in the schema/client.

- [ ] **Step 3: Implement enriched Worker schema and prompt**

Extend Worker `KittenChatInput` with:

```ts
childProfile?: Record<string, unknown>;
approvedMemories: Array<{ id: string; kind: string; text: string }>;
```

Update `chatJsonSchema()` to include:

```ts
memoryCandidates: {
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
}
```

Add `memoryCandidates` to `required`.

Update `buildChatPrompt(input)` to include:

```ts
`孩子画像：${JSON.stringify(input.childProfile ?? {})}`,
`已确认记忆：${JSON.stringify(input.approvedMemories.slice(0, 8))}`,
```

Update developer prompt to say:

```text
只在信息稳定、轻量、对学习陪伴有帮助时返回 memoryCandidates；不要保存住址、学校全名、电话、身份证件、医疗诊断、家庭隐私或孩子要求隐瞒家长的信息。
```

Update parser to return `memoryCandidates`.

- [ ] **Step 4: Implement enriched frontend client**

In `src/components/kittenChat.ts`, extend types:

```ts
export interface KittenMemoryCandidateReply {
  kind: "profile" | "preference" | "learning" | "emotion";
  text: string;
  confidence: number;
}

export interface KittenCompanionReply {
  // existing fields
  memoryCandidates: KittenMemoryCandidateReply[];
}

export interface KittenCompanionRequest {
  // existing fields
  childProfile?: Partial<ChildCompanionProfile>;
  approvedMemories?: Pick<ApprovedKittenMemory, "id" | "kind" | "text">[];
}
```

Validate reply candidates in `isKittenCompanionReply`.

- [ ] **Step 5: Run enriched chat tests**

Run:

```bash
npm test -- workers/kitten-voice/src/index.test.ts src/components/kittenChat.test.ts
```

Expected: tests pass.

### Task 4: Voice Recording And Transcription Client

**Files:**
- Create: `src/components/kittenVoiceInput.ts`
- Test: `src/components/kittenVoiceInput.test.ts`

- [ ] **Step 1: Write failing client tests**

Create `src/components/kittenVoiceInput.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { resolveKittenTranscribeApiUrl, transcribeKittenAudio } from "./kittenVoiceInput";

describe("kitten voice input", () => {
  it("derives the transcription endpoint from the speech endpoint", () => {
    expect(resolveKittenTranscribeApiUrl("https://voice.example.com/kitten-speech")).toBe("https://voice.example.com/kitten-transcribe");
    expect(resolveKittenTranscribeApiUrl("")).toBeUndefined();
  });

  it("posts recorded audio to the transcription endpoint", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(_input).toBe("https://voice.example.com/kitten-transcribe");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      return new Response(JSON.stringify({ text: "我不会这道题" }), {
        headers: { "Content-Type": "application/json" }
      });
    });

    await expect(
      transcribeKittenAudio(new Blob(["voice"], { type: "audio/webm" }), {
        voiceApiUrl: "https://voice.example.com/kitten-speech",
        fetcher
      })
    ).resolves.toEqual({ ok: true, text: "我不会这道题" });
  });

  it("returns failure for missing endpoint or tiny audio", async () => {
    await expect(transcribeKittenAudio(new Blob(["voice"], { type: "audio/webm" }), { voiceApiUrl: "" })).resolves.toEqual({ ok: false });
    await expect(transcribeKittenAudio(new Blob([], { type: "audio/webm" }), { voiceApiUrl: "https://voice.example.com/kitten-speech" })).resolves.toEqual({
      ok: false
    });
  });
});
```

- [ ] **Step 2: Run failing client tests**

Run:

```bash
npm test -- src/components/kittenVoiceInput.test.ts
```

Expected: fails because `kittenVoiceInput.ts` does not exist.

- [ ] **Step 3: Implement transcription client**

Create `src/components/kittenVoiceInput.ts`:

```ts
export type KittenTranscriptionResult = { ok: true; text: string } | { ok: false };

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
  if (!transcribeApiUrl || blob.size < 1) return { ok: false };
  try {
    const body = new FormData();
    body.set("audio", blob, "kitten-voice.webm");
    const response = await (options.fetcher ?? fetch)(transcribeApiUrl, {
      method: "POST",
      body
    });
    if (!response.ok) return { ok: false };
    const payload = (await response.json()) as { text?: unknown };
    return typeof payload.text === "string" && payload.text.trim() ? { ok: true, text: payload.text.trim() } : { ok: false };
  } catch {
    return { ok: false };
  }
}
```

- [ ] **Step 4: Run voice input tests**

Run:

```bash
npm test -- src/components/kittenVoiceInput.test.ts
```

Expected: tests pass.

### Task 5: Store Actions For Profile And Memories

**Files:**
- Modify: `src/state/useStudyStore.tsx`
- Test: `src/state/useStudyStore.test.tsx`

- [ ] **Step 1: Write failing store tests**

Add to `src/state/useStudyStore.test.tsx` a render-hook style component or existing provider test that calls actions:

```ts
actions.updateChildCompanionProfile({ nickname: "小雨", gradeBand: "lower-primary" });
actions.addKittenMemoryCandidates([{ kind: "learning", text: "小雨数学口算容易烦。", confidence: 0.8 }]);
actions.approveKittenMemoryCandidate(candidateId, "小雨数学口算容易烦。");
```

Assert approved memories contain the edited text and pending candidates are empty.

- [ ] **Step 2: Run failing store tests**

Run:

```bash
npm test -- src/state/useStudyStore.test.tsx
```

Expected: fails because actions do not exist.

- [ ] **Step 3: Implement store actions**

Import helpers from `src/domain/kittenMemory.ts`, extend `StudyActions` with:

```ts
updateChildCompanionProfile(input: Partial<ChildCompanionProfile>): void;
addKittenMemoryCandidates(candidates: NewKittenMemoryCandidate[]): void;
approveKittenMemoryCandidate(candidateId: string, text: string): void;
rejectKittenMemoryCandidate(candidateId: string): void;
deleteKittenMemory(memoryId: string): void;
clearKittenMemories(): void;
```

Implement each action explicitly:

```ts
updateChildCompanionProfile(input) {
  setState((current) => updateChildCompanionProfile(current, input));
},
addKittenMemoryCandidates(candidates) {
  setState((current) => addKittenMemoryCandidates(current, candidates, new Date().toISOString()));
},
approveKittenMemoryCandidate(candidateId, text) {
  setState((current) => approveKittenMemoryCandidate(current, candidateId, text, new Date().toISOString()));
},
rejectKittenMemoryCandidate(candidateId) {
  setState((current) => rejectKittenMemoryCandidate(current, candidateId));
},
deleteKittenMemory(memoryId) {
  setState((current) => deleteKittenMemory(current, memoryId));
},
clearKittenMemories() {
  setState((current) => clearKittenMemories(current));
}
```

- [ ] **Step 4: Run store tests**

Run:

```bash
npm test -- src/state/useStudyStore.test.tsx src/domain/kittenMemory.test.ts
```

Expected: tests pass.

### Task 6: PetPanel Voice Conversation UI

**Files:**
- Modify: `src/components/PetPanel.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Add two tests to `src/App.test.tsx`:

1. Microphone denied:

```ts
it("keeps text input usable when microphone permission is denied", async () => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => Promise.reject(new DOMException("denied", "NotAllowedError"))) }
  });
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));
  const dialog = screen.getByRole("dialog", { name: "小猫互动" });
  await user.click(within(dialog).getByRole("button", { name: "和小猫说话" }));

  expect(await within(dialog).findByText("麦克风没有打开，也可以打字告诉小猫。")).toBeInTheDocument();
  expect(within(dialog).getByLabelText("想和小猫说什么")).toBeInTheDocument();
});
```

2. Successful voice flow using stubbed `MediaRecorder`, `fetch`, and `Audio`:

```ts
it("transcribes voice, gets an AI reply, stores memory candidates, and speaks", async () => {
  vi.stubEnv("VITE_KITTEN_VOICE_API_URL", "https://voice.example.com/kitten-speech");
  const stream = new MediaStream();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => stream) }
  });
  class MockMediaRecorder extends EventTarget {
    state: "inactive" | "recording" = "inactive";
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["voice"], { type: "audio/webm" }) } as BlobEvent);
      this.onstop?.();
    }
  }
  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/kitten-transcribe")) {
      return new Response(JSON.stringify({ text: "我不会这道题，我有点烦" }), { headers: { "Content-Type": "application/json" } });
    }
    if (String(input).endsWith("/kitten-chat")) {
      return new Response(
        JSON.stringify({
          text: "小雨，我听见你有点烦了。我们先圈出关键词。",
          emotion: "care",
          nextAction: "圈出关键词",
          shouldAskAdult: false,
          memoryCandidates: [{ kind: "learning", text: "小雨做题烦时适合先圈关键词。", confidence: 0.8 }],
          source: "ai"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(new Blob(["mp3"], { type: "audio/mpeg" }), { headers: { "Content-Type": "audio/mpeg" } });
  });
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal(
    "Audio",
    class {
      play = vi.fn(async () => undefined);
    }
  );

  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole("button", { name: "孩子模式" }));
  await user.click(screen.getByRole("button", { name: "和小猫互动" }));
  const dialog = screen.getByRole("dialog", { name: "小猫互动" });
  await user.click(within(dialog).getByRole("button", { name: "和小猫说话" }));
  await user.click(within(dialog).getByRole("button", { name: "说完了" }));

  expect(await within(dialog).findByText(/你刚才说：我不会这道题/)).toBeInTheDocument();
  expect(await within(dialog).findByText(/小雨，我听见你有点烦/)).toBeInTheDocument();
  expect(await within(dialog).findByText("小猫想记住 1 条新发现")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing UI tests**

Run:

```bash
npm test -- src/App.test.tsx -t "麦克风|transcribes voice"
```

Expected: fails because voice UI does not exist.

- [ ] **Step 3: Implement voice UI**

In `PetPanel.tsx`:

- Add `voiceStatus` state: `"idle" | "recording" | "transcribing" | "thinking" | "speaking" | "error"`.
- Add `mediaRecorderRef` and `audioChunksRef`.
- Add `startRecording()` using `navigator.mediaDevices.getUserMedia({ audio: true })`.
- Add `stopRecording()` that builds a `Blob`, calls `transcribeKittenAudio`, then sends transcript to the same companion flow as text.
- Extend `handleStudyCompanion` to accept transcript text, pass `state.childCompanionProfile` and `state.approvedKittenMemories` to `askKittenCompanion`, and call `actions.addKittenMemoryCandidates(aiResult.reply.memoryCandidates)` when present.
- Add visible UI:

```tsx
<button className="primaryButton voiceButton" onClick={() => (voiceStatus === "recording" ? void stopRecording() : void startRecording())}>
  {voiceStatus === "recording" ? "说完了" : "和小猫说话"}
</button>
<p className="companionThinking">{voiceStatusText}</p>
{lastTranscript && <p className="childTranscript">你刚才说：{lastTranscript}</p>}
```

In `styles.css`, add `.voiceButton`, `.childTranscript`, and recording-state treatment.

- [ ] **Step 4: Run focused UI tests**

Run:

```bash
npm test -- src/App.test.tsx -t "麦克风|transcribes voice"
```

Expected: tests pass.

### Task 7: Parent Memory Management UI

**Files:**
- Modify: `src/components/ParentDashboard.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write failing parent UI tests**

Add an integration test that seeds localStorage with one pending memory candidate and one approved memory, opens parent mode, and verifies:

```ts
expect(screen.getByRole("heading", { name: "小猫记忆" })).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "确认 小雨数学口算容易烦。" }));
expect(screen.getByText("已确认记忆")).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "删除 小雨数学口算容易烦。" }));
expect(screen.queryByText("小雨数学口算容易烦。")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run failing parent UI tests**

Run:

```bash
npm test -- src/App.test.tsx -t 小猫记忆
```

Expected: fails because parent memory UI does not exist.

- [ ] **Step 3: Implement parent memory UI**

In `ParentDashboard.tsx`, use `useStudyStore()` state/actions and add a section:

```tsx
<section className="memoryPanel" aria-label="小猫记忆">
  <h2>小猫记忆</h2>
  <p>小猫只应该记住帮助学习陪伴的轻量信息。请不要保存住址、学校全名、电话、身份证件、医疗诊断或家庭隐私。</p>
  {/* child profile summary */}
  {/* pending candidates with confirm/reject */}
  {/* approved memories with delete/clear */}
</section>
```

Use buttons with accessible names:

- `确认 ${candidate.text}`
- `不要记住 ${candidate.text}`
- `删除 ${memory.text}`
- `清空小猫记忆`

- [ ] **Step 4: Run parent UI tests**

Run:

```bash
npm test -- src/App.test.tsx -t 小猫记忆
```

Expected: tests pass.

### Task 8: Final Verification, Deployment, Commit

**Files:**
- All changed files.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Deploy Worker**

Run:

```bash
npx wrangler deploy
```

from `workers/kitten-voice`.

Expected: deployment succeeds and reports `https://kids-learn-kitten-voice.wangyun1517.workers.dev`.

- [ ] **Step 4: Smoke test Worker endpoints**

Run:

```bash
curl -sS -X POST https://kids-learn-kitten-voice.wangyun1517.workers.dev/kitten-chat \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://127.0.0.1:5173' \
  --data '{"message":"我不会这道题，我有点烦","trigger":"voice","petName":"小奶糖","petLevel":2,"childProfile":{"nickname":"小雨","gradeBand":"lower-primary","favoriteColors":[],"favoriteDecorations":[],"trickySubjects":[]},"approvedMemories":[]}'
```

Expected: JSON with `text`, `emotion`, `nextAction`, `memoryCandidates`, and `source`.

- [ ] **Step 5: Commit and push**

Run:

```bash
git add docs/superpowers/plans/2026-05-15-voice-memory-kitten-companion.md workers/kitten-voice/src/index.ts workers/kitten-voice/src/index.test.ts src/domain/types.ts src/domain/defaultState.ts src/storage/localStore.ts src/domain/kittenMemory.ts src/domain/kittenMemory.test.ts src/state/useStudyStore.tsx src/state/useStudyStore.test.tsx src/components/kittenChat.ts src/components/kittenChat.test.ts src/components/kittenVoiceInput.ts src/components/kittenVoiceInput.test.ts src/components/PetPanel.tsx src/components/ParentDashboard.tsx src/App.test.tsx src/styles.css
git commit -m "feat: add voice memory kitten companion"
git push
```

Expected: commit and push succeed.
