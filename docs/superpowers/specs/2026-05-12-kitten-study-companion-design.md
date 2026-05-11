# Kitten Study Companion Design

## Goal

Turn the kitten into a warm homework companion that helps a child start, stay with, and finish schoolwork while preserving clear safety boundaries.

## Selected Direction

The selected personality is **mixed companion mode**:

- Usually a gentle learning companion.
- When the child is stuck, a small coach.
- When the child finishes, a friend who celebrates effort.

The selected interaction model is **buttons plus short text input**:

- Buttons cover common homework moments.
- A short input lets the child feel heard without opening unrestricted chat.

## Safety Context

This feature is designed for a child-facing education app. OpenAI's under-18 API guidance says developers serving minors should add safeguards, age-appropriate disclosures, content filters, monitoring/escalation paths, and heightened care around minors' data and interactions. OpenAI usage policies also require keeping minors safe and prohibit exposing minors to age-inappropriate content or interfering with education through academic dishonesty.

References:

- https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance
- https://openai.com/policies/usage-policies/

Because of this, the first implementation should not be a fully open AI companion. It should be a bounded learning-support interaction with short, safe responses.

## Role Definition

The kitten is:

- A named homework companion.
- A gentle starter when the child resists beginning.
- A small coach when the child is stuck.
- A friend who notices effort and celebrates completion.
- A bridge to parents when the child needs help.

The kitten is not:

- A teacher replacing the parent.
- An answer machine.
- A therapist.
- A general-purpose friend for long conversations.
- A human or a pretend-human authority.

## First Version Interaction

Add a new "学习陪伴" area inside the full-screen kitten panel.

Quick buttons:

- `陪我开始`
- `我不想写`
- `我卡住了`
- `我写完了`
- `给我打气`

Short input:

- Label: `想和小猫说什么`
- Placeholder: `比如：我不会这题 / 我有点烦`
- Max length: 80 Chinese characters or equivalent Unicode characters.
- Empty input should not produce a response.

Submit button:

- `告诉小猫`

## Response Strategy

Responses should be one or two short sentences. They should feel spoken, kind, and specific.

### 陪我开始

Purpose: reduce friction and help the child begin.

Example:

```text
我坐到你旁边啦。我们不做全部，先看第一题 30 秒，好不好？
```

### 我不想写

Purpose: validate the feeling, then suggest a very small first action.

Example:

```text
不想开始也没关系，开始本来就有点难。我们先把作业本打开，只做这一小步。
```

### 我卡住了

Purpose: normalize being stuck and coach a process, not an answer.

Example:

```text
卡住不是失败，是题目在提醒我们慢一点。先圈出题目里最重要的一个词吧。
```

### 我写完了

Purpose: celebrate effort and reinforce persistence.

Example:

```text
你是一步一步写完的，不是一下子变出来的。我想把这次坚持放进今天的成长记忆里。
```

### 给我打气

Purpose: restore motivation.

Example:

```text
你不用一下子很厉害，只要先往前挪一小步。小猫会在旁边陪你。
```

### Short Input

The child can enter a short message. First version uses local intent matching, not open generative chat.

Intent matching:

- Contains `不会`, `不懂`, `难`, `卡住`: stuck response.
- Contains `不想`, `烦`, `累`, `讨厌`: reluctance/comfort response.
- Contains `写完`, `完成`, `做好`: completion response.
- Contains `开始`, `陪我`: start response.
- Otherwise: generic companion response.

Generic response:

```text
我听见啦。我们先把它变成一个小小的动作，做完这一点再看下一步。
```

## Homework Integrity Boundaries

The kitten should never directly solve homework.

Allowed:

- "先读题。"
- "圈出关键词。"
- "把第一步写下来。"
- "如果还是不会，可以请家长看一下题目。"

Not allowed:

- Providing final answers.
- Writing essays for the child.
- Doing calculations for the child.
- Telling the child to hide mistakes from parents.
- Encouraging skipping homework.

## Emotional Safety Boundaries

The kitten should never shame the child.

Do not say:

- "你太懒了。"
- "这么简单都不会。"
- "你不写我就不喜欢你。"
- "别告诉爸爸妈妈。"

If the child expresses strong distress, fear, self-harm, or unsafe family situations, first version should avoid pretending to counsel. It should gently direct the child to an adult:

```text
这听起来有点重要，小猫想让你找爸爸妈妈或老师一起说。你不用一个人扛着。
```

## Data And Privacy

First version stores only the latest kitten speech in existing local state. It does not send the child's free-text input to OpenAI for chat generation.

AI usage remains limited to TTS through the existing Worker:

- The frontend sends the generated safe response text to `/kitten-speech`.
- The Worker returns audio.
- The child's raw input is not sent to OpenAI in this version.

This keeps the first child-facing companion feature lower risk while still using AI voice.

## UI Design

In the full-screen kitten panel, add a compact `学习陪伴` section above the decoration shop.

Layout:

- Section heading: `学习陪伴`
- Quick buttons in a two-column responsive grid.
- Short input row under buttons.
- The kitten speech bubble continues to show the latest response.
- Existing AI-generated voice disclosure remains visible.

The feature should not create a separate chat page yet.

## Future AI Conversation Path

After the bounded version is stable, add a Worker endpoint such as `/kitten-chat`.

Future endpoint input:

- Trigger or short child message.
- Pet name and level.
- Current task name if available.
- Current homework state.

Future model behavior:

- Generate one short age-appropriate response.
- Refuse answer-giving.
- Redirect sensitive or unsafe content to adults.
- Return structured JSON: `{ kind, text, shouldEscalateToAdult }`.

This future version must add server-side moderation or guardrails before sending raw child input to an LLM.

## Testing Requirements

Domain tests:

- Each quick button returns the expected response kind.
- Short input maps to the correct intent.
- Empty input returns no response.
- Overlong input is trimmed.
- Unsafe distress text returns adult-escalation response.

UI tests:

- Full-screen kitten panel shows `学习陪伴`.
- Clicking each quick button updates the speech bubble.
- Submitting short input updates the speech bubble.
- Empty input does not change the speech bubble.
- A companion response calls existing voice playback.

Voice tests:

- Existing AI voice path is reused.
- Local fallback remains unchanged.

## Out Of Scope

- Open-ended AI chat.
- Sending child free-text input to OpenAI for response generation.
- Microphone input.
- Parent dashboard analytics for child emotions.
- Storing conversation history.
- Detecting exact school subject or solving homework content.
