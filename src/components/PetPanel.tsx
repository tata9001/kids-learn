import { useEffect, useState, type FormEvent } from "react";
import type { PetState } from "../domain/types";
import { CAT_DECORATIONS, getCatDecoration, getCatStage } from "../domain/cats";
import { buildPetSpeech, getPetDisplayName } from "../domain/petSpeech";
import { CatFigure } from "./CatCompanion";
import { playKittenSound, type KittenSoundKind } from "./petSounds";
import { speakKittenLine } from "./petVoice";
import { useStudyStore } from "../state/useStudyStore";

export function PetPanel({ pet }: { pet: PetState }) {
  const { actions } = useStudyStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [draftName, setDraftName] = useState(getPetDisplayName(pet));
  const [soundMessage, setSoundMessage] = useState("点一下小猫，它会回应你");
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
    speakKittenLine(line);
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
