import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PetSpeechKind, PetState } from "../domain/types";
import { CAT_DECORATIONS, getCatDecoration, getCatStage } from "../domain/cats";
import {
  MAX_COMPANION_INPUT_LENGTH,
  buildPetSpeech,
  buildStudyCompanionSpeech,
  getPetDisplayName,
  sanitizeCompanionMessage,
  type StudyCompanionTrigger
} from "../domain/petSpeech";
import { CatFigure } from "./CatCompanion";
import { askKittenCompanion, type KittenCompanionEmotion } from "./kittenChat";
import { transcribeKittenAudio } from "./kittenVoiceInput";
import { playKittenSound, type KittenSoundKind } from "./petSounds";
import { speakKittenLine } from "./petVoice";
import { useStudyStore } from "../state/useStudyStore";

export function PetPanel({ pet }: { pet: PetState }) {
  const { state, actions } = useStudyStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompanionThinking, setIsCompanionThinking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "transcribing" | "thinking" | "speaking" | "error">("idle");
  const [draftName, setDraftName] = useState(getPetDisplayName(pet));
  const [companionMessage, setCompanionMessage] = useState("");
  const [soundMessage, setSoundMessage] = useState("点一下小猫，它会回应你");
  const [voiceMessage, setVoiceMessage] = useState("可以直接和小猫说话");
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastMemoryCandidateCount, setLastMemoryCandidateCount] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const stage = getCatStage(pet.level);
  const petName = getPetDisplayName(pet);
  const speechLine = pet.speech?.text ?? soundMessage;
  const decorations = pet.unlockedDecorations.length > 0 ? pet.unlockedDecorations.length : 0;
  const progress = Math.min(100, Math.round((pet.experience / pet.experienceToNextLevel) * 100));
  const equippedDecoration = pet.equippedDecorationId ? getCatDecoration(pet.equippedDecorationId) : undefined;

  useEffect(() => {
    if (isPlaying) setDraftName(petName);
  }, [isPlaying, petName]);

  function handleInteraction(kind: "pet" | "feed" | "play") {
    playKittenSound(kind);
    actions.interactWithPet(kind);
    setSoundMessage(kind === "pet" ? "喵，小猫听见你了" : kind === "feed" ? "小猫开心地吃下小鱼干" : "小猫绕着你跳了一圈");
  }

  function handleDecorationAction(action: () => void, sound: KittenSoundKind, message: string) {
    playKittenSound(sound);
    action();
    setSoundMessage(message);
  }

  function handleSpeak() {
    const line = buildPetSpeech(pet, "manual", new Date().toISOString()).text;
    playKittenSound("speak");
    actions.makePetSpeak("manual");
    void speakKittenLine(line);
  }

  function speechKindForCompanionEmotion(emotion: KittenCompanionEmotion): PetSpeechKind {
    if (emotion === "care") return "comfort";
    if (emotion === "celebrate") return "task";
    return "coach";
  }

  async function handleStudyCompanion(trigger: StudyCompanionTrigger, childMessage?: string, options: { fromVoice?: boolean } = {}) {
    const createdAt = new Date().toISOString();
    const localSpeech = buildStudyCompanionSpeech(pet, trigger, childMessage, createdAt);
    const message = trigger === "message" ? sanitizeCompanionMessage(childMessage ?? "") : localSpeech?.text ?? trigger;
    if (!localSpeech || !message) return;

    setIsCompanionThinking(true);
    if (options.fromVoice) {
      setVoiceStatus("thinking");
      setVoiceMessage("小猫正在想怎么帮你");
    }
    const activeTask = state.activeTaskId ? state.tasks[state.activeTaskId] : undefined;
    const aiResult = await askKittenCompanion({
      message,
      trigger,
      petName,
      petLevel: pet.level,
      currentTaskName: activeTask?.name,
      childProfile: state.childCompanionProfile,
      approvedMemories: state.approvedKittenMemories.map((memory) => ({ id: memory.id, kind: memory.kind, text: memory.text }))
    });
    setIsCompanionThinking(false);

    const speech = aiResult.ok
      ? {
          text: aiResult.reply.text,
          kind: speechKindForCompanionEmotion(aiResult.reply.emotion),
          source: aiResult.reply.source,
          createdAt
        }
      : localSpeech;

    if (!speech) return;

    playKittenSound("speak");
    if (aiResult.ok) {
      actions.recordPetSpeech(speech);
      if (aiResult.reply.memoryCandidates.length > 0) {
        actions.addKittenMemoryCandidates(aiResult.reply.memoryCandidates);
        setLastMemoryCandidateCount(aiResult.reply.memoryCandidates.length);
      } else {
        setLastMemoryCandidateCount(0);
      }
    } else {
      actions.makeStudyCompanionSpeak(trigger, childMessage);
      setLastMemoryCandidateCount(0);
    }
    if (options.fromVoice) {
      setVoiceStatus("speaking");
      setVoiceMessage("小猫正在回答你");
    }
    await speakKittenLine(speech.text);
    if (options.fromVoice) {
      setVoiceStatus("idle");
      setVoiceMessage("可以继续和小猫说话");
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceStatus("error");
      setVoiceMessage("麦克风没有打开，也可以打字告诉小猫。");
      return;
    }

    try {
      setLastMemoryCandidateCount(0);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void finishRecording();
      };
      recorder.start();
      setVoiceStatus("recording");
      setVoiceMessage("小猫正在听你说");
    } catch {
      setVoiceStatus("error");
      setVoiceMessage("麦克风没有打开，也可以打字告诉小猫。");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
    }
  }

  async function finishRecording() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setVoiceStatus("transcribing");
    setVoiceMessage("小猫正在听清你刚才说的话");

    const audioBlob = new Blob(audioChunksRef.current, { type: audioChunksRef.current[0]?.type || "audio/webm" });
    audioChunksRef.current = [];
    const transcript = await transcribeKittenAudio(audioBlob);
    if (!transcript.ok) {
      setVoiceStatus("error");
      setVoiceMessage("小猫没有听清楚，也可以打字告诉小猫。");
      return;
    }

    setLastTranscript(transcript.text);
    await handleStudyCompanion("message", transcript.text, { fromVoice: true });
  }

  function handleCompanionMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = sanitizeCompanionMessage(companionMessage);
    if (!message) return;
    handleStudyCompanion("message", message);
    setCompanionMessage("");
  }

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    playKittenSound("speak");
    actions.renamePet(draftName);
  }

  return (
    <>
      <section className={`petPanel mood-${pet.mood}`} aria-label="小猫伙伴">
        <button className="catFigureButton" aria-label="和小猫互动" onClick={() => setIsPlaying(true)}>
          <CatFigure stage={stage} level={pet.level} decorationId={pet.equippedDecorationId} />
        </button>
        <div className="catInfo">
          <p className="eyebrow">小猫伙伴 · 等级 {pet.level}</p>
          <h2>{petName} · {stage.title}</h2>
          <p>{stage.form}</p>
          <p className="petSpeechBubble">{pet.speech?.text ?? `${petName}在等你开始今天的小挑战。`}</p>
          <p className="catSkill">{stage.skill}</p>
          <div className="catStats" aria-label="小猫成长数据">
            <span>能量 {pet.energy}</span>
            <span>经验 {pet.experience}/{pet.experienceToNextLevel}</span>
            <span>连续 {pet.streakDays} 天</span>
            <span>小鱼干 {pet.careItems}</span>
            <span>收藏 {decorations}</span>
            <span>装饰 {equippedDecoration?.name ?? "未穿戴"}</span>
          </div>
          <div className="xpTrack" aria-label={`经验 ${pet.experience}/${pet.experienceToNextLevel}`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="catReward">{pet.recentReward}</p>
          <p className="catNextGoal">{pet.nextUnlock || stage.unlock}</p>
          <div className="petActions">
            <button className="secondaryButton compactButton" aria-label="打开小猫互动面板" onClick={() => setIsPlaying(true)}>
              和小猫互动
            </button>
            <button className="secondaryButton compactButton" onClick={handleSpeak}>
              小猫说一句
            </button>
            <button className="secondaryButton compactButton" onClick={() => actions.setMode("cats")}>
              查看小猫图鉴
            </button>
          </div>
        </div>
      </section>

      {isPlaying && (
        <section className={`petPlayground mood-${pet.mood}`} role="dialog" aria-modal="true" aria-label="小猫互动">
          <button className="playgroundClose" aria-label="关闭小猫互动" onClick={() => setIsPlaying(false)}>
            ×
          </button>
          <div className="playgroundCat">
            <button className="catFigureButton catFigureButton-large" aria-label="摸摸小猫身体" onClick={() => handleInteraction("pet")}>
              <CatFigure stage={stage} level={pet.level} decorationId={pet.equippedDecorationId} />
            </button>
            <div className="soundWave" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="playgroundPanel">
            <p className="eyebrow">全屏互动 · 等级 {pet.level}</p>
            <h2>{petName} · {stage.title}</h2>
            <p className="petSpeechBubble">{speechLine}</p>
            <p className="voiceDisclosure">使用 AI 语音时，小猫声音由 AI 生成，不是真人声音。</p>
            <form className="petNameForm" onSubmit={handleRename}>
              <label htmlFor="pet-name-input">小猫名字</label>
              <div>
                <input
                  id="pet-name-input"
                  value={draftName}
                  maxLength={16}
                  onChange={(event) => setDraftName(event.target.value)}
                />
                <button className="secondaryButton compactButton" type="submit">
                  保存小猫名字
                </button>
                <button
                  className="secondaryButton compactButton"
                  type="button"
                  onClick={() => {
                    playKittenSound("speak");
                    actions.clearPetName();
                    setDraftName("小奶糖");
                  }}
                >
                  恢复默认名字
                </button>
              </div>
            </form>
            <div className="catStats" aria-label="互动数据">
              <span>能量 {pet.energy}</span>
              <span>经验 {pet.experience}/{pet.experienceToNextLevel}</span>
              <span>小鱼干 {pet.careItems}</span>
              <span>收藏 {decorations}</span>
              <span>装饰 {equippedDecoration?.name ?? "未穿戴"}</span>
            </div>
            <div className="playgroundActions">
              <button className="primaryButton" onClick={() => handleInteraction("pet")}>
                摸摸小猫
              </button>
              <button className="primaryButton" onClick={() => handleInteraction("feed")}>
                喂小鱼干
              </button>
              <button className="primaryButton" onClick={() => handleInteraction("play")}>
                陪它玩一会儿
              </button>
              <button className="primaryButton" onClick={handleSpeak}>
                小猫说一句
              </button>
            </div>
            <section className="studyCompanionPanel" aria-label="学习陪伴">
              <h2>学习陪伴</h2>
              {isCompanionThinking && <p className="companionThinking">小猫正在认真听你说...</p>}
              <div className={`voiceCompanionBox voice-${voiceStatus}`}>
                <button
                  className="primaryButton voiceButton"
                  disabled={voiceStatus === "transcribing" || voiceStatus === "thinking" || voiceStatus === "speaking" || isCompanionThinking}
                  onClick={() => (voiceStatus === "recording" ? stopRecording() : void startRecording())}
                >
                  {voiceStatus === "recording" ? "说完了" : "和小猫说话"}
                </button>
                <p className="companionThinking">{voiceMessage}</p>
                {lastTranscript && <p className="childTranscript">你刚才说：{lastTranscript}</p>}
                {lastMemoryCandidateCount > 0 && <p className="memoryCandidateHint">小猫想记住 {lastMemoryCandidateCount} 条新发现</p>}
              </div>
              <div className="studyCompanionButtons">
                <button className="secondaryButton compactButton" disabled={isCompanionThinking} onClick={() => void handleStudyCompanion("start")}>
                  陪我开始
                </button>
                <button className="secondaryButton compactButton" disabled={isCompanionThinking} onClick={() => void handleStudyCompanion("reluctant")}>
                  我不想写
                </button>
                <button className="secondaryButton compactButton" disabled={isCompanionThinking} onClick={() => void handleStudyCompanion("stuck")}>
                  我卡住了
                </button>
                <button className="secondaryButton compactButton" disabled={isCompanionThinking} onClick={() => void handleStudyCompanion("done")}>
                  我写完了
                </button>
                <button className="secondaryButton compactButton" disabled={isCompanionThinking} onClick={() => void handleStudyCompanion("encourage")}>
                  给我打气
                </button>
              </div>
              <form className="studyCompanionForm" onSubmit={handleCompanionMessage}>
                <label htmlFor="companion-message-input">想和小猫说什么</label>
                <div>
                  <input
                    id="companion-message-input"
                    value={companionMessage}
                    maxLength={MAX_COMPANION_INPUT_LENGTH}
                    placeholder="比如：我不会这题 / 我有点烦"
                    onChange={(event) => setCompanionMessage(event.target.value)}
                  />
                  <button className="secondaryButton compactButton" type="submit">
                    {isCompanionThinking ? "小猫在听" : "告诉小猫"}
                  </button>
                </div>
              </form>
            </section>
            <p className="catReward">{pet.recentReward}</p>
            <section className="decorationShop" aria-label="装饰小猫">
              <h2>装饰小猫</h2>
              {pet.equippedDecorationId && (
                <button
                  className="secondaryButton compactButton"
                  onClick={() => handleDecorationAction(actions.removePetDecoration, "undress", "小猫把装饰收进收藏盒了")}
                >
                  取下当前装饰
                </button>
              )}
              <div className="decorationGrid">
                {CAT_DECORATIONS.map((decoration) => {
                  const owned = (pet.ownedDecorationIds ?? []).includes(decoration.id);
                  const equipped = pet.equippedDecorationId === decoration.id;
                  const label = owned
                    ? equipped
                      ? `已穿上 ${decoration.name}`
                      : `穿上 ${decoration.name}`
                    : `兑换 ${decoration.name}，${decoration.cost} 小鱼干`;

                  return (
                    <article key={decoration.id} className={`decorationCard ${equipped ? "isEquipped" : ""}`}>
                      <div className={`decorationPreview decorationPreview-${decoration.className}`} aria-hidden="true" />
                      <div>
                        <h3>{decoration.name}</h3>
                        <p>{decoration.description}</p>
                        <p className="catNextGoal">{owned ? "已收藏" : `${decoration.cost} 小鱼干`}</p>
                      </div>
                      <button
                        className="secondaryButton compactButton"
                        disabled={equipped}
                        onClick={() =>
                          handleDecorationAction(
                            () => (owned ? actions.equipPetDecoration(decoration.id) : actions.purchasePetDecoration(decoration.id)),
                            "dress",
                            owned ? `小猫换上了${decoration.name}` : `小猫试戴了${decoration.name}`
                          )
                        }
                      >
                        {label}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      )}
    </>
  );
}
