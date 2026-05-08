# Kitten Voice And Naming Design

## Goal

Make the kitten feel like a named learning companion that can speak short, safe, encouraging lines now, while leaving a clean path for future AI voice conversation.

## First Version Scope

This version focuses on local, safe interaction rather than open-ended AI chat.

- Children can name the kitten and rename it later.
- The kitten name appears in the pet panel, fullscreen interaction panel, gallery, and speech UI.
- The kitten can say short contextual lines in a speech bubble.
- Lines combine two roles:
  - Warm companion: encourage, comfort, celebrate.
  - Learning coach: help the child start, split work into the next small step, and return after rest.
- The interaction panel has a "小猫说一句" action that plays a richer sound and shows a suitable line.
- The data model leaves room for future voice input, AI response text, and text-to-speech playback.

## Out Of Scope For First Version

- No open-ended AI conversation yet.
- No recording child voice yet.
- No external network calls.
- No parental analytics for conversation history.
- No long chat transcript. The kitten speaks short, timely lines only.

## User Experience

### Naming

If the kitten has no custom name, the app uses a friendly default name. The child can open the fullscreen interaction panel and choose "给小猫起名".

Naming rules:

- Trim leading and trailing spaces.
- Limit display length to avoid breaking compact UI.
- Empty names are ignored.
- Renaming does not reset level, decorations, collections, streak, energy, or experience.

### Speech Bubble

The pet panel and fullscreen interaction panel show a compact speech bubble.

Examples:

- Before starting: "我们先做最小的一步，好不好？"
- After focus: "我看到你坚持完了，尾巴都开心起来了。"
- After task completion: "这个任务被你拿下啦，我想收进今天的纪念里。"
- Low energy: "我有点想补充能量，我们先完成一个小目标吧。"
- Task adjustment: "难一点也没关系，我们把它拆小。"
- Daily streak milestone: "这是我们的坚持纪念，我想把它放进收藏里。"

### Learning Coach Behavior

The kitten does not scold or shame. It always gives a next step.

- If there are unfinished tasks, it nudges the child to choose one.
- If the child starts focus, it reinforces "只做这一件事".
- If the child finishes focus, it celebrates effort.
- If the child completes a task, it links the achievement to kitten growth.

### Future AI Voice Path

The first version should structure speech as records with:

- `id`
- `kind`
- `text`
- `createdAt`
- optional `source`

Future AI integration can replace or extend local line selection without changing the pet UI. Voice playback can later attach audio URLs or generated speech state to the same records.

## Data Model

Extend `PetState` with:

- `name?: string`
- `speech?: PetSpeech`

Add:

```ts
export type PetSpeechKind =
  | "greeting"
  | "start"
  | "focus"
  | "task"
  | "streak"
  | "comfort"
  | "coach"
  | "decoration";

export interface PetSpeech {
  id: string;
  kind: PetSpeechKind;
  text: string;
  createdAt: string;
  source: "local";
}
```

The local storage migration should normalize missing fields so existing users keep their current kitten progress.

## Domain Behavior

Add domain helpers:

- `renamePet(state, name)` updates the kitten name after trimming and length limiting.
- `clearPetName(state)` returns the kitten to the default name.
- `makePetSpeak(state, trigger, now)` chooses a local line and stores it in `pet.speech`.

Speech triggers should include:

- manual interaction
- focus completion
- task completion
- daily goal
- decoration purchase or equip
- low energy coaching

## UI Behavior

### Pet Panel

- Show custom kitten name if set.
- Show stage title as secondary text, for example "豆豆 · 奶糖小猫".
- Show the latest speech bubble above the reward text.

### Fullscreen Interaction

Add:

- "给小猫起名" input or compact rename panel.
- "小猫说一句" button.
- Speech bubble near the kitten.
- Keep existing touch, feed, play, decoration shop, and sound behavior.

### Cat Gallery

- Use the kitten name in the hero copy and collection section.
- Keep all growth-stage names unchanged.

## Safety And Tone

The kitten should:

- Use short child-friendly Chinese.
- Praise effort, not intelligence.
- Offer the next tiny action.
- Avoid guilt, pressure, ranking, or comparison.
- Avoid pretending to be a human.

## Acceptance Criteria

- A child can name the kitten and see the name persist after reload.
- A child can rename the kitten without losing pet progress.
- The kitten can show contextual local speech in the pet panel and fullscreen interaction panel.
- "小猫说一句" updates the speech bubble and plays a distinct sound.
- Focus reward, task reward, daily goal reward, and decoration actions can update the kitten's speech.
- Existing saved data without name or speech fields still loads.
- Tests cover naming, local speech selection, UI rename flow, and storage migration.
