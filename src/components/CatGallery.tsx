import type { PetState } from "../domain/types";
import { CAT_DECORATIONS, CAT_STAGES, getCatDecoration, getCollectionLabel } from "../domain/cats";
import { getPetDisplayName } from "../domain/petSpeech";
import { CatFigure } from "./CatCompanion";

const STAT_GUIDE = [
  {
    name: "能量",
    meaning: "表示小猫今天的活力。完成专注块会增加能量，让孩子直观看到努力有反馈。",
    use: "喂小鱼干可以恢复能量，陪小猫玩会消耗能量并换成经验。"
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
    use: "在小猫互动里可以喂给小猫，留下喂养纪念，也让能量更充足。"
  },
  {
    name: "收藏",
    meaning: "已经解锁的小猫装饰和成长纪念。",
    use: "连续达标、喂养、陪玩都会留下纪念，让孩子看到长期积累。"
  }
];

export function CatGallery({ pet }: { pet: PetState }) {
  const decorations = pet.unlockedDecorations.length;
  const equippedDecoration = pet.equippedDecorationId ? getCatDecoration(pet.equippedDecorationId) : undefined;
  const petName = getPetDisplayName(pet);

  return (
    <section className="catGallery">
      <section className="galleryHero">
        <div>
          <p className="eyebrow">成长伙伴</p>
          <h2>认识每只小猫</h2>
          <p>{petName}会记录每一次专注、完成任务和连续坚持，让孩子更容易期待下一次学习。</p>
        </div>
        <div className="galleryHeroStats" aria-label="当前小猫数据">
          <span>能量 {pet.energy}</span>
          <span>经验 {pet.experience}/{pet.experienceToNextLevel}</span>
          <span>连续 {pet.streakDays} 天</span>
          <span>小鱼干 {pet.careItems}</span>
          <span>收藏 {decorations}</span>
          <span>装饰 {equippedDecoration?.name ?? "未穿戴"}</span>
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

      <section className="collectionShelf" aria-label="小猫收藏">
        <h2>{petName}已经收藏</h2>
        <div className="ownedDecorationRow" aria-label="已拥有装饰">
          {CAT_DECORATIONS.map((decoration) => {
            const owned = (pet.ownedDecorationIds ?? []).includes(decoration.id);
            return (
              <span key={decoration.id} className={owned ? "isOwned" : "isLockedDecoration"}>
                {decoration.name} · {owned ? (pet.equippedDecorationId === decoration.id ? "穿戴中" : "已拥有") : `${decoration.cost} 小鱼干`}
              </span>
            );
          })}
        </div>
        {pet.unlockedDecorations.length > 0 ? (
          <div className="collectionGrid">
            {pet.unlockedDecorations.map((collectionId) => (
              <span key={collectionId}>{getCollectionLabel(collectionId)}</span>
            ))}
          </div>
        ) : (
          <p className="emptyHint">还没有收藏。连续达标、喂小鱼干、陪小猫玩都会留下成长纪念。</p>
        )}
      </section>
    </section>
  );
}
