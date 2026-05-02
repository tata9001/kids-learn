import type { PetState } from "../domain/types";
import { CatFigure, getCatStage } from "./CatCompanion";
import { useStudyStore } from "../state/useStudyStore";

export function PetPanel({ pet }: { pet: PetState }) {
  const { actions } = useStudyStore();
  const stage = getCatStage(pet.level);
  const decorations = pet.unlockedDecorations.length > 0 ? pet.unlockedDecorations.length : 0;
  const progress = Math.min(100, Math.round((pet.experience / pet.experienceToNextLevel) * 100));

  return (
    <section className={`petPanel mood-${pet.mood}`} aria-label="小猫伙伴">
      <CatFigure stage={stage} level={pet.level} />
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
        <button className="secondaryButton compactButton" onClick={() => actions.setMode("cats")}>
          查看小猫图鉴
        </button>
      </div>
    </section>
  );
}
