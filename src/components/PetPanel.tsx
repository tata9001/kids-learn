import type { PetState } from "../domain/types";

interface CatStage {
  title: string;
  form: string;
  skill: string;
  nextGoal: string;
  className: string;
}

const CAT_STAGES: CatStage[] = [
  {
    title: "奶糖小猫",
    form: "刚来到家的小猫，会在旁边安静看你学习。",
    skill: "陪伴技能：开始任务时轻轻喵一声。",
    nextGoal: "连续达成 3 天目标，解锁铃铛小猫。",
    className: "kitten"
  },
  {
    title: "铃铛小猫",
    form: "戴上小铃铛，完成任务后会开心转圈。",
    skill: "鼓励技能：完成专注后送出一枚小爪印。",
    nextGoal: "连续达成 7 天目标，解锁云朵小猫窝。",
    className: "bell"
  },
  {
    title: "云朵小猫",
    form: "有了软软猫窝，休息时会打滚补充能量。",
    skill: "休息技能：提醒孩子放松眼睛和伸展手臂。",
    nextGoal: "连续达成 14 天目标，解锁星星胡须小猫。",
    className: "cloud"
  },
  {
    title: "星星小猫",
    form: "胡须闪着星光，像学习小队长一样精神。",
    skill: "队长技能：帮孩子庆祝一整天的坚持。",
    nextGoal: "继续保持，小猫会收集更多星星徽章。",
    className: "star"
  }
];

function getCatStage(level: number): CatStage {
  return CAT_STAGES[Math.min(Math.max(level, 1), CAT_STAGES.length) - 1];
}

export function PetPanel({ pet }: { pet: PetState }) {
  const stage = getCatStage(pet.level);
  const decorations = pet.unlockedDecorations.length > 0 ? pet.unlockedDecorations.length : 0;
  const progress = Math.min(100, Math.round((pet.experience / pet.experienceToNextLevel) * 100));

  return (
    <section className={`petPanel mood-${pet.mood} cat-${stage.className}`} aria-label="小猫伙伴">
      <div className="catAvatar" aria-hidden="true">
        <span className="catEar catEarLeft" />
        <span className="catEar catEarRight" />
        <span className="catFace">
          <span className="catEye" />
          <span className="catNose" />
          <span className="catEye" />
        </span>
        <span className="catMouth">ω</span>
        <span className="catBadge">{pet.level}</span>
      </div>
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
        <p className="catNextGoal">{pet.nextUnlock || stage.nextGoal}</p>
      </div>
    </section>
  );
}
