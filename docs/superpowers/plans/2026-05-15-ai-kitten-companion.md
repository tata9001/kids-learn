# AI Kitten Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static kitten study companion replies with a bounded AI companion that can respond naturally to a child while preserving homework and child-safety guardrails.

**Architecture:** Extend the existing Cloudflare Worker with `/kitten-chat` next to `/kitten-speech`. The frontend derives the chat endpoint from `VITE_KITTEN_VOICE_API_URL`, calls AI for companion interactions, falls back to local deterministic replies when unavailable, stores the AI reply in pet speech state, and speaks the reply with the existing voice path.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Cloudflare Workers, OpenAI Responses API structured outputs.

---

### Task 1: Worker AI Chat Endpoint

**Files:**
- Modify: `workers/kitten-voice/src/index.ts`
- Test: `workers/kitten-voice/src/index.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for `/kitten-chat` request validation, local unsafe escalation, OpenAI Responses API payload shape, structured JSON parsing, and upstream failure.

- [x] **Step 2: Run focused Worker tests**

Run: `npm test -- workers/kitten-voice/src/index.test.ts`

Expected: fail because `/kitten-chat` is not implemented.

- [x] **Step 3: Implement Worker endpoint**

Add child-message sanitization, local danger escalation, OpenAI Responses API call, JSON schema response format, and JSON response helpers.

- [x] **Step 4: Run focused Worker tests**

Run: `npm test -- workers/kitten-voice/src/index.test.ts`

Expected: pass.

### Task 2: Frontend Chat Client

**Files:**
- Create: `src/components/kittenChat.ts`
- Test: `src/components/kittenChat.test.ts`

- [x] **Step 1: Write failing client tests**

Test endpoint derivation from `VITE_KITTEN_VOICE_API_URL`, valid POST body, fallback URL override, response parsing, and failure result.

- [x] **Step 2: Implement client**

Add `askKittenCompanion` with safe request payload types and `resolveKittenChatApiUrl`.

- [x] **Step 3: Run focused client tests**

Run: `npm test -- src/components/kittenChat.test.ts`

Expected: pass.

### Task 3: Pet Speech State And UI Integration

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/petSpeech.ts`
- Modify: `src/domain/petSpeech.test.ts`
- Modify: `src/state/useStudyStore.tsx`
- Modify: `src/components/PetPanel.tsx`
- Modify: `src/App.test.tsx`

- [x] **Step 1: Write failing UI/state tests**

Test that AI companion replies are stored with `source: "ai"`, spoken, and local fallback still works.

- [x] **Step 2: Implement state and UI**

Allow `PetSpeech.source` to be `ai`, add action to record companion reply, call `askKittenCompanion` before local fallback, show a small thinking state, and speak the final reply.

- [x] **Step 3: Run focused tests**

Run: `npm test -- src/domain/petSpeech.test.ts src/components/kittenChat.test.ts src/App.test.tsx -t 小猫`

Expected: pass.

### Task 4: Verification

**Files:**
- Verify all changed files.

- [x] **Step 1: Run all tests**

Run: `npm test`

Expected: all tests pass.

- [x] **Step 2: Run production build**

Run: `npm run build`

Expected: build succeeds.
