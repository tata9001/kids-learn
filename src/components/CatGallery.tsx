import type { PetState } from "../domain/types";
import { CAT_STAGES, CatFigure } from "./CatCompanion";

const STAT_GUIDE = [
  {
    name: "能量",
    meaning: "表示小猫今天的活力。完成专注块会增加能量，让孩子直观看到努力有反馈。",
    use: "用于提醒今天已经进入学习状态，后续可以扩展为换装或休息互动消耗。"
  },
  {
    name: "经验",
    meaning: "小猫升级进度。专注、完成任务、达成每日目标都会增加经验。",
    use: "经验满了会升级，解锁新的小猫形态和更明显的鼓励反馈。"
  },
  {
    name: "连续",
    meaning: "连续达成每日目标的天数，是孩子坚持感的记录。",
    use: "达到 3、7、14 天时解锁里程碑装饰，帮助孩子期待下一次成长。"
  },
  {
    name: "小鱼干",
    meaning: "完成任务后获得的照顾道具，像给小猫的小奖励。",
    use: "用于展示孩子完成了多少个可确认成果，后续可以作为喂养和装饰兑换资源。"
  },
  {
    name: "收藏",
    meaning: "已经解锁的小猫装饰和成长纪念。",
    use: "用于沉淀长期成就，让孩子看到自己不是只完成今天，而是在持续积累。"
  }
];

export function CatGallery({ pet }: { pet: PetState }) {
  const decorations = pet.unlockedDecorations.length;

  return (
    <section className="catGallery">
      <section className="galleryHero">
        <div>
          <p className="eyebrow">成长伙伴</p>
          <h2>认识每只小猫</h2>
          <p>每一次专注、完成任务和连续坚持，都会让小猫更精神，也让孩子更容易期待下一次学习。</p>
        </div>
        <div className="galleryHeroStats" aria-label="当前小猫数据">
          <span>能量 {pet.energy}</span>
          <span>经验 {pet.experience}/{pet.experienceToNextLevel}</span>
          <span>连续 {pet.streakDays} 天</span>
          <span>小鱼干 {pet.careItems}</span>
          <span>收藏 {decorations}</span>
        </div>
      </section>

      <section className="catStageGrid" aria-label="全部小猫形象">
        {CAT_STAGES.map((stage) => {
          const unlocked = pet.level >= stage.level;
          return (
            <article key={stage.title} className={`catStageCard ${unlocked ? "isUnlocked" : "isLocked"}`}>
              <CatFigure stage={stage} level={stage.level} size="small" />
              <div>
                <p className="eyebrow">{unlocked ? "已遇见" : "待解锁"} · 等级 {stage.level}</p>
                <h3>{stage.title}</h3>
                <p>{stage.form}</p>
                <p className="catSkill">{stage.skill}</p>
                <p className="catNextGoal">{stage.unlock}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="statGuide" aria-label="成长数据说明">
        <h2>成长数据有什么用</h2>
        <div className="statGuideGrid">
          {STAT_GUIDE.map((item) => (
            <article key={item.name} className="statGuideCard">
              <h3>{item.name}</h3>
              <p>{item.meaning}</p>
              <p>{item.use}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
