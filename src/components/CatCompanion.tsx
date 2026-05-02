export interface CatStage {
  level: number;
  title: string;
  form: string;
  skill: string;
  unlock: string;
  className: string;
}

export const CAT_STAGES: CatStage[] = [
  {
    level: 1,
    title: "奶糖小猫",
    form: "圆圆脸和奶油色毛毛，适合陪孩子安静开始。",
    skill: "开始任务时轻轻摆尾，提醒先做一个小步骤。",
    unlock: "初始伙伴",
    className: "kitten"
  },
  {
    level: 2,
    title: "铃铛小猫",
    form: "戴上小铃铛，完成任务后会开心抬爪。",
    skill: "完成专注后送出一枚小爪印。",
    unlock: "经验升到 2 级",
    className: "bell"
  },
  {
    level: 3,
    title: "云朵小猫",
    form: "有软软云朵猫窝，休息时会慢慢打盹。",
    skill: "提醒孩子放松眼睛和伸展手臂。",
    unlock: "经验升到 3 级",
    className: "cloud"
  },
  {
    level: 4,
    title: "星星小猫",
    form: "胡须闪着小星光，像学习小队长一样精神。",
    skill: "帮孩子庆祝一整天的坚持。",
    unlock: "经验升到 4 级",
    className: "star"
  }
];

export function getCatStage(level: number): CatStage {
  return CAT_STAGES[Math.min(Math.max(level, 1), CAT_STAGES.length) - 1];
}

export function CatFigure({ stage, level, size = "large" }: { stage: CatStage; level?: number; size?: "large" | "small" }) {
  return (
    <div className={`catFigure cat-${stage.className} catFigure-${size}`} aria-hidden="true">
      <span className="catShadow" />
      <span className="catTail" />
      <span className="catBody">
        <span className="catChest" />
        <span className="catPaw catPawLeft" />
        <span className="catPaw catPawRight" />
      </span>
      <span className="catHead">
        <span className="catEar catEarLeft" />
        <span className="catEar catEarRight" />
        <span className="catInnerEar catInnerEarLeft" />
        <span className="catInnerEar catInnerEarRight" />
        <span className="catStripe catStripeLeft" />
        <span className="catStripe catStripeRight" />
        <span className="catEye catEyeLeft" />
        <span className="catEye catEyeRight" />
        <span className="catBlush catBlushLeft" />
        <span className="catBlush catBlushRight" />
        <span className="catNose" />
        <span className="catMouth" />
        <span className="catWhisker catWhiskerLeftA" />
        <span className="catWhisker catWhiskerLeftB" />
        <span className="catWhisker catWhiskerRightA" />
        <span className="catWhisker catWhiskerRightB" />
      </span>
      <span className="catAccessory" />
      {level && <span className="catBadge">{level}</span>}
    </div>
  );
}
