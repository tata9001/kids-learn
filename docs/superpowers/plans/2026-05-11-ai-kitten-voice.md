# AI Kitten Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-generated kitten speech through a Cloudflare Worker while preserving browser-local voice fallback.

**Architecture:** The React app calls a configurable voice endpoint from `src/components/petVoice.ts`. A new `workers/kitten-voice` Worker validates text, calls OpenAI `POST /v1/audio/speech`, and returns `audio/mpeg`; if anything fails, the frontend falls back to the existing `speechSynthesis` path.

**Tech Stack:** React, TypeScript, Vitest, Vite env vars, Cloudflare Workers, Wrangler, OpenAI Speech API.

---

### Task 1: Cloudflare Worker Voice Proxy

**Files:**
- Create: `workers/kitten-voice/src/index.ts`
- Create: `workers/kitten-voice/src/index.test.ts`
- Create: `workers/kitten-voice/wrangler.jsonc`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`

- [x] **Step 1: Write failing Worker tests**

Create tests for validation, CORS, OpenAI forwarding, audio proxying, and OpenAI failure.

- [x] **Step 2: Run tests to verify RED**

Run: `npm test -- workers/kitten-voice/src/index.test.ts`

Expected: fail because `workers/kitten-voice/src/index.ts` does not exist.

- [x] **Step 3: Implement Worker**

Implement `handleKittenVoiceRequest(request, env, fetcher = fetch)` with:

- `OPTIONS` preflight response.
- `POST /kitten-speech` only.
- trimmed text capped at 180 characters.
- `gpt-4o-mini-tts`, `coral`, and the Chinese kitten voice instructions.
- `OPENAI_API_KEY` only read from Worker environment.

- [x] **Step 4: Configure Wrangler and test exclusions**

Use `wrangler.jsonc` with `compatibility_date` set to `2026-05-11`, `nodejs_compat`, and observability enabled. Exclude Worker tests from the browser/jsdom test run only if needed; otherwise keep them under Vitest.

- [x] **Step 5: Run Worker tests to verify GREEN**

Run: `npm test -- workers/kitten-voice/src/index.test.ts`

Expected: Worker tests pass.

### Task 2: Frontend AI Voice Gateway

**Files:**
- Modify: `src/components/petVoice.ts`
- Modify: `src/components/petVoice.test.ts`
- Modify: `src/App.test.tsx`
- Modify: `src/components/PetPanel.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Write failing frontend tests**

Add tests that `speakKittenLine` calls AI endpoint when configured, plays returned audio, falls back to local voice on failure, and uses local voice directly when no endpoint is configured.

- [x] **Step 2: Run tests to verify RED**

Run: `npm test -- src/components/petVoice.test.ts src/App.test.tsx`

Expected: fail because `speakKittenLine` is still synchronous/local-only.

- [x] **Step 3: Implement async AI-first speech**

Change `speakKittenLine` to return `Promise<"ai" | "local" | "silent">`. It should call `fetch(import.meta.env.VITE_KITTEN_VOICE_API_URL)`, create an object URL from the audio blob, play it with `new Audio(url)`, revoke the URL, and fall back to local voice on any failure.

- [x] **Step 4: Update PetPanel and disclosure**

Make `handleSpeak` call the async voice gateway without blocking UI speech text updates. Add the disclosure text: `小猫语音由 AI 生成，不是真人声音。`

- [x] **Step 5: Run frontend tests to verify GREEN**

Run: `npm test -- src/components/petVoice.test.ts src/App.test.tsx`

Expected: frontend tests pass.

### Task 3: Configuration And Verification

**Files:**
- Create: `.env.example`
- Modify: `README.md` if it exists; otherwise add notes to this plan only.

- [x] **Step 1: Add env example**

Create `.env.example` with:

```bash
VITE_KITTEN_VOICE_API_URL=https://your-worker.your-subdomain.workers.dev/kitten-speech
```

- [x] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected: all tests and build pass.

- [x] **Step 3: Browser check**

Open `http://127.0.0.1:5173/kids-learn/` and verify `小猫说一句` still updates the text and does not break when no AI endpoint is configured.

- [x] **Step 4: Commit and push**

Commit implementation and push `main`.
