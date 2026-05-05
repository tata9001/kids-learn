import { useState } from "react";
import type { PetState } from "../domain/types";
import { getCatStage } from "../domain/cats";
import { CatFigure } from "./CatCompanion";
import { useStudyStore } from "../state/useStudyStore";

type WindowWithAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function playKittenSound() {
  const AudioCtor = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
  if (!AudioCtor) return;

  const context = new AudioCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(520, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(780, context.currentTime + 0.08);
  oscillator.frequency.exponentialRampToValueAtTime(430, context.currentTime + 0.24);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.34);
}

export function PetPanel({ pet }: { pet: PetState }) {
  const { actions } = useStudyStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundMessage, setSoundMessage] = useState("点一下小猫，它会回应你");
  const stage = getCatStage(pet.level);
  const decorations = pet.unlockedDecorations.length > 0 ? pet.unlockedDecorations.length : 0;
  const progress = Math.min(100, Math.round((pet.experience / pet.experienceToNextLevel) * 100));

  function handleInteraction(kind: "pet" | "feed" | "play") {
    playKittenSound();
    actions.interactWithPet(kind);
    setSoundMessage(kind === "pet" ? "喵，小猫听见你了" : kind === "feed" ? "小猫开心地吃下小鱼干" : "小猫绕着你跳了一圈");
  }

  return (
    <>
      <section className={`petPanel mood-${pet.mood}`} aria-label="小猫伙伴">
        <button className="catFigureButton" aria-label="和小猫互动" onClick={() => setIsPlaying(true)}>
          <CatFigure stage={stage} level={pet.level} />
        </button>
        <div className="catInfo">
          <p className="eyebrow">小猫伙伴 · 等级 {pet.level}</p>
          <h2>{stage.title}</h2>
          <p>{stage.form}</p>
          <p className="catSkill">{stage.skill}</p>
          <div className="catStats" aria-label="小猫成长数据">
            <span>能量 {pet.energy}</span>
            <span>经验 {pet.experience}/{pet.experienceToNextLevel}</span>
            <span>连续 {pet.streakDays} 天</span>
            <span>小鱼干 {pet.careItems}</span>
            <span>收藏 {decorations}</span>
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
              <CatFigure stage={stage} level={pet.level} />
            </button>
            <div className="soundWave" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="playgroundPanel">
            <p className="eyebrow">全屏互动 · 等级 {pet.level}</p>
            <h2>{stage.title}</h2>
            <p>{soundMessage}</p>
            <div className="catStats" aria-label="互动数据">
              <span>能量 {pet.energy}</span>
              <span>经验 {pet.experience}/{pet.experienceToNextLevel}</span>
              <span>小鱼干 {pet.careItems}</span>
              <span>收藏 {decorations}</span>
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
            </div>
            <p className="catReward">{pet.recentReward}</p>
          </div>
        </section>
      )}
    </>
  );
}
