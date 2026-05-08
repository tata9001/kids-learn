# Kitten Voice Naming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add kitten naming and safe local speech so the pet feels like a named learning companion while preserving a future AI voice path.

**Architecture:** Extend `PetState` with optional `name` and `speech`, add focused domain helpers in a new `src/domain/petSpeech.ts`, then wire store actions and pet UI controls through existing `PetPanel` and `CatGallery`. Local storage migration normalizes missing fields so old saved pets continue to load.

**Tech Stack:** React, TypeScript, Vitest, localStorage, existing Vite app structure.

---

### Task 1: Domain Model And Speech Helpers

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/petSpeech.ts`
- Modify: `src/domain/defaultState.ts`
- Modify: `src/storage/localStore.ts`
- Test: `src/domain/petSpeech.test.ts`

- [x] **Step 1: Write failing tests for naming and local speech**

Add tests proving `renamePet`, `clearPetName`, and `makePetSpeak` exist, sanitize names, preserve progress, and produce local short speech.

- [x] **Step 2: Run tests to verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/domain/petSpeech.test.ts`

Expected: fail because `src/domain/petSpeech.ts` does not exist.

- [x] **Step 3: Implement model and helpers**

Add `PetSpeechKind`, `PetSpeech`, `name?: string`, and `speech?: PetSpeech` to `PetState`. Implement local helper functions with a default name of `小奶糖`.

- [x] **Step 4: Normalize storage**

Update `normalizePet` so missing `name` and `speech` fields are accepted and malformed empty names are ignored.

- [x] **Step 5: Run tests to verify GREEN**

Run: `TZ=Asia/Shanghai npm test -- src/domain/petSpeech.test.ts src/storage/localStore.test.ts`

Expected: all selected tests pass.

### Task 2: Reward And Store Integration

**Files:**
- Modify: `src/domain/rewards.ts`
- Modify: `src/domain/rewards.test.ts`
- Modify: `src/state/useStudyStore.tsx`
- Modify: `src/state/useStudyStore.test.tsx`

- [x] **Step 1: Write failing tests for speech updates during rewards**

Add tests proving focus rewards, task rewards, daily goals, and decoration actions can update `pet.speech`.

- [x] **Step 2: Run tests to verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/domain/rewards.test.ts`

Expected: fail because rewards do not yet attach speech.

- [x] **Step 3: Add store actions**

Expose `renamePet`, `clearPetName`, and `makePetSpeak` from `useStudyStore`.

- [x] **Step 4: Update rewards**

Call `makePetSpeak` from focus, task, daily goal, decoration purchase/equip/remove, and low energy branches.

- [x] **Step 5: Run tests to verify GREEN**

Run: `TZ=Asia/Shanghai npm test -- src/domain/rewards.test.ts src/state/useStudyStore.test.tsx`

Expected: all selected tests pass.

### Task 3: Pet UI Naming And Speech

**Files:**
- Modify: `src/components/PetPanel.tsx`
- Modify: `src/components/CatGallery.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Write failing UI tests**

Add tests proving the child can name the kitten, see the name in the panel, reload with the same name, and click `小猫说一句` to update the speech bubble.

- [x] **Step 2: Run tests to verify RED**

Run: `TZ=Asia/Shanghai npm test -- src/App.test.tsx`

Expected: fail because rename controls and speech action do not exist.

- [x] **Step 3: Implement UI**

Add speech bubble, rename form, `小猫说一句` button, name display in pet panel and fullscreen panel, and gallery copy using the kitten name.

- [x] **Step 4: Run tests to verify GREEN**

Run: `TZ=Asia/Shanghai npm test -- src/App.test.tsx`

Expected: all selected tests pass.

### Task 4: Final Verification

**Files:**
- Verify all changed files.

- [x] **Step 1: Full test suite**

Run: `TZ=Asia/Shanghai npm test`

Expected: all tests pass.

- [x] **Step 2: Production build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

- [x] **Step 3: Browser check**

Open `http://127.0.0.1:5173/kids-learn/`, verify the kitten can be named, speaks a local line, and the layout remains usable.
