# Voice Memory Kitten Companion Design

## Goal

Upgrade the kitten from a short text-response helper into a voice-first learning companion that can talk with a child, gradually understand her preferences, and remain parent-visible and safety-bounded.

## Product Direction

The first version uses a controlled push-to-talk flow:

1. The child opens the full-screen kitten panel.
2. The child clicks `和小猫说话`.
3. The UI enters recording state: `小猫在听你说...`.
4. The child clicks again to stop recording.
5. The frontend sends the audio to the Worker `/kitten-transcribe`.
6. The Worker uses OpenAI speech-to-text and returns text.
7. The frontend sends the transcript plus child profile and approved memories to `/kitten-chat`.
8. The Worker returns a kitten reply and memory candidates.
9. The frontend plays the reply through the existing `/kitten-speech` voice path.
10. Memory candidates appear in parent mode for review before becoming approved memories.

This avoids fully continuous listening in the first version while still making the kitten feel like a voice companion.

## Companion Role

The kitten is:

- A named learning friend.
- A homework starter and gentle coach.
- A listener for mild frustration, resistance, or confusion.
- A celebration partner when the child finishes.
- A bridge to parents or teachers when the child needs adult help.

The kitten is not:

- A homework answer machine.
- A replacement teacher.
- A therapist.
- A secret friend that encourages hiding things from adults.
- A place to store sensitive identity, contact, school, medical, or family-conflict details.

## Voice Interaction

### Child UI

The full-screen kitten panel becomes the primary companion surface.

Primary states:

- `idle`: button text `和小猫说话`.
- `recording`: button text `说完了`, status `小猫在听你说...`.
- `transcribing`: status `小猫在听懂刚才的话...`.
- `thinking`: status `小猫正在想怎么陪你...`.
- `speaking`: status `小猫正在说话...`.
- `error`: status `小猫刚才没听清，我们再试一次。`

The existing short text input remains as a fallback for quiet environments or microphone failure.

### Browser Audio Capture

The frontend uses `navigator.mediaDevices.getUserMedia({ audio: true })` and `MediaRecorder`.

Recording rules:

- The child starts and stops manually.
- Maximum recording length: 20 seconds.
- Empty or very short audio returns a friendly retry message.
- If microphone permission is denied, the UI keeps the text input available.
- Audio is not stored in local state.

## Worker Endpoints

### `/kitten-transcribe`

Input:

- `multipart/form-data`
- `audio`: recorded audio blob.

Output:

```json
{
  "text": "我不会这道题，我有点烦"
}
```

Rules:

- Requires `OPENAI_API_KEY`.
- Uses OpenAI speech-to-text.
- Trims transcript to 160 Unicode characters before returning.
- Returns `400` for missing audio.
- Returns `502` when transcription fails.

### `/kitten-chat`

Existing endpoint evolves to accept profile and memory context.

Input:

```json
{
  "message": "我不会这道题，我有点烦",
  "trigger": "voice",
  "petName": "小奶糖",
  "petLevel": 4,
  "currentTaskName": "数学口算",
  "childProfile": {
    "nickname": "小雨",
    "gradeBand": "lower-primary",
    "preferredAddress": "小雨",
    "favoriteColors": ["粉色"],
    "favoriteDecorations": ["粉色蝴蝶结"],
    "encouragementStyle": "先鼓励再给一步",
    "trickySubjects": ["math"],
    "frustrationSupport": "先共情，再拆第一步",
    "recentLearningState": "数学口算容易烦"
  },
  "approvedMemories": [
    {
      "id": "memory-1",
      "kind": "learning",
      "text": "小雨做数学口算时容易着急，先圈关键词会更稳。"
    }
  ]
}
```

Output:

```json
{
  "text": "小雨，我听见你有点烦了。我们先不求答案，只把题目里最重要的数字圈出来，我陪你看第一步。",
  "emotion": "care",
  "nextAction": "圈出题目关键词",
  "shouldAskAdult": false,
  "memoryCandidates": [
    {
      "kind": "learning",
      "text": "小雨做数学口算时容易烦，需要先共情再拆第一步。",
      "confidence": 0.74
    }
  ],
  "source": "ai"
}
```

Rules:

- Reply in one or two short Chinese sentences.
- Use child nickname or preferred address when available.
- Never directly solve homework.
- Never store or encourage sensitive private information.
- Return memory candidates only when the information is stable and useful for future learning support.
- Dangerous or highly distressed content returns adult escalation and no memory candidate.

## Child Profile

The first version stores profile locally in the existing study state. The data model is designed so it can later sync to Cloudflare D1.

Fields:

- `nickname`: child nickname.
- `gradeBand`: `preschool`, `lower-primary`, `upper-primary`, or `unknown`.
- `preferredAddress`: how the kitten should call the child.
- `favoriteColors`: short list.
- `favoriteDecorations`: short list.
- `encouragementStyle`: short phrase, for example `先鼓励再给一步`.
- `trickySubjects`: subject ids such as `math`, `chinese`, `english`, `reading`, `writing`, `other`.
- `frustrationSupport`: how to help when the child resists or feels stuck.
- `recentLearningState`: one short summary of recent learning mood or state.

Excluded from long-term profile:

- Address.
- School full name.
- Phone number.
- ID numbers.
- Exact family conflict details.
- Medical or psychological diagnoses.
- Secrets the child says not to tell parents.

## Memory Model

Memories are split into approved memories and pending candidates.

Approved memory:

```json
{
  "id": "memory-20260515-1",
  "kind": "learning",
  "text": "小雨做数学口算时容易着急，先圈关键词会更稳。",
  "createdAt": "2026-05-15T09:00:00+08:00",
  "approvedAt": "2026-05-15T09:05:00+08:00",
  "source": "ai-candidate"
}
```

Pending memory candidate:

```json
{
  "id": "candidate-20260515-1",
  "kind": "preference",
  "text": "小雨喜欢粉色蝴蝶结。",
  "confidence": 0.82,
  "createdAt": "2026-05-15T09:00:00+08:00",
  "status": "pending-parent"
}
```

Memory kinds:

- `profile`: basic child-facing identity or address preference.
- `preference`: color, decoration, encouragement preference, small interests.
- `learning`: subject difficulty, useful learning strategy, task habit.
- `emotion`: repeated support pattern, for example how to help when frustrated.

Rules:

- AI can only create candidates.
- Parent approval is required before candidates become approved memories.
- Lightweight preferences may ask the child: `小猫可以记住你喜欢粉色吗？`
- The child-confirmed preference still appears in parent mode as visible history.
- Parents can approve, edit, reject, delete, and clear memories.

## Parent Mode

Add a `小猫记忆` section in parent mode.

It shows:

- Child profile summary.
- Pending memory candidates.
- Approved memories.
- Buttons: `确认`, `编辑`, `不要记住`, `删除`, `清空小猫记忆`.

Parent copy:

```text
小猫只应该记住帮助学习陪伴的轻量信息。请不要保存住址、学校全名、电话、身份证件、医疗诊断或家庭隐私。
```

## Safety Boundaries

The kitten can:

- Encourage starting.
- Reflect mild feelings.
- Help split homework into the first step.
- Suggest asking a parent or teacher.
- Remember learning preferences after parent review.

The kitten cannot:

- Provide final answers.
- Write essays for the child.
- Do calculations for the child.
- Save sensitive private information.
- Encourage hiding from parents.
- Continue casual chat after self-harm, abuse, or unsafe-family signals.

Danger escalation text:

```text
这听起来有点重要，小猫想让你找爸爸妈妈或老师一起说。你不用一个人扛着。
```

## Data And Privacy

First version:

- Audio is sent to the Worker for transcription.
- Audio is not stored in browser state.
- Transcript is used for the current turn.
- Child profile, approved memories, and pending candidates are stored locally.
- The Worker receives only the profile and memory snippets needed for the current response.

Future cloud sync:

- Use family-scoped records.
- Add explicit parent-controlled sync.
- Keep memory edit/delete flows before enabling sync.
- Avoid syncing raw audio.

## Error Handling

- Microphone denied: show text input and message `麦克风没有打开，也可以打字告诉小猫。`
- Recording too short: `小猫刚才没听清，我们再试一次。`
- Transcription failure: keep local text input available.
- Chat failure: fall back to bounded local companion response.
- Voice playback failure: show text response and keep local browser voice fallback.

## Testing Requirements

Worker tests:

- `/kitten-transcribe` returns `400` without audio.
- `/kitten-transcribe` forwards audio to OpenAI and trims transcript.
- `/kitten-chat` includes profile and approved memories in prompt context.
- `/kitten-chat` returns memory candidates from structured output.
- Unsafe child messages return adult escalation and no memory candidates.

Domain tests:

- Profile updates preserve existing study state.
- Pending memory candidates can be added.
- Parent can approve, edit, reject, delete, and clear memories.
- Sensitive memory candidates are rejected or filtered.

UI tests:

- Child can start and stop recording.
- Permission denial leaves text input usable.
- Voice transcript appears as the latest child message.
- AI reply appears in the speech bubble and triggers voice playback.
- Parent mode shows pending memory candidates.
- Parent approval moves a candidate into approved memories.

## Out Of Scope

- Fully continuous voice conversation.
- Wake-word listening.
- Cloud account system.
- Cloud memory sync.
- Raw audio history.
- Parent analytics dashboard.
- Solving exact homework content.
