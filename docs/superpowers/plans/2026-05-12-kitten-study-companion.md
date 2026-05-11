# Kitten Study Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first bounded kitten study companion interaction inside the full-screen kitten panel.

**Architecture:** Keep child input handling local and deterministic. Add a small domain layer in `petSpeech.ts` that maps quick buttons and short text to safe companion replies, then expose it through the existing study store and reuse the existing kitten voice path in `PetPanel`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing local store and AI TTS helper.

---

### Task 1: Domain Companion Replies

**Files:**
- Modify: `src/domain/petSpeech.ts`
- Test: `src/domain/petSpeech.test.ts`

- [x] **Step 1: Write failing tests**

Add tests that call `buildStudyCompanionSpeech` for quick buttons, short input intent matching, empty input, input trimming, and unsafe escalation.

- [x] **Step 2: Run focused domain tests**

Run: `npm test -- src/domain/petSpeech.test.ts`

Expected: fail because `buildStudyCompanionSpeech` does not exist.

- [x] **Step 3: Implement minimal domain code**

Add `StudyCompanionTrigger`, `MAX_COMPANION_INPUT_LENGTH`, `sanitizeCompanionMessage`, `detectStudyCompanionTrigger`, and `buildStudyCompanionSpeech` in `petSpeech.ts`.

- [x] **Step 4: Run focused domain tests**

Run: `npm test -- src/domain/petSpeech.test.ts`

Expected: pass.

### Task 2: Store Action

**Files:**
- Modify: `src/state/useStudyStore.tsx`

- [x] **Step 1: Add store action**

Expose `makeStudyCompanionSpeak(trigger, childMessage?)` and update state with the new domain helper.

- [x] **Step 2: Run store and domain tests**

Run: `npm test -- src/domain/petSpeech.test.ts src/state/useStudyStore.test.tsx`

Expected: pass.

### Task 3: Pet Panel UI

**Files:**
- Modify: `src/components/PetPanel.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

- [x] **Step 1: Write failing UI test**

Add an app test that opens the full-screen kitten panel, sees `学习陪伴`, clicks `我卡住了`, submits a short input, and verifies the speech bubble updates.

- [x] **Step 2: Run focused UI test**

Run: `npm test -- src/App.test.tsx -t 学习陪伴`

Expected: fail because the UI is not present.

- [x] **Step 3: Implement UI**

Add the companion section above decoration shop with quick buttons, short input, empty-submit guard, and voice playback via `speakKittenLine`.

- [x] **Step 4: Run focused UI test**

Run: `npm test -- src/App.test.tsx -t 学习陪伴`

Expected: pass.

### Task 4: Verification And Commit

**Files:**
- Verify all changed files.

- [x] **Step 1: Run full tests**

Run: `npm test`

Expected: all tests pass.

- [x] **Step 2: Run production build**

Run: `npm run build`

Expected: build succeeds.

- [x] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-05-12-kitten-study-companion.md src/domain/petSpeech.ts src/domain/petSpeech.test.ts src/state/useStudyStore.tsx src/components/PetPanel.tsx src/styles.css src/App.test.tsx
git commit -m "feat: add kitten study companion"
```
