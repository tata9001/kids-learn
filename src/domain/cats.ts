export interface CatStage {
  level: number;
  title: string;
  form: string;
  skill: string;
  unlock: string;
  className: string;
}

export interface CatDecoration {
  id: string;
  name: string;
  description: string;
  cost: number;
  className: string;
}

export const CAT_DECORATIONS: CatDecoration[] = [
  {
    id: "pink-bow",
    name: "粉色蝴蝶结",
    description: "戴在耳边，像准备认真开始的小约定。",
    cost: 2,
    className: "pinkBow"
  },
  {
    id: "bell-collar",
    name: "小铃铛项圈",
    description: "完成任务后轻轻响一下，提醒努力被看见。",
    cost: 3,
    className: "bellCollar"
  },
  {
    id: "brave-cape",
    name: "勇气披风",
    description: "遇到难题时，陪孩子先试一小步。",
    cost: 4,
    className: "braveCape"
  },
  {
    id: "moon-charm",
    name: "月牙挂坠",
    description: "适合一天收尾时看看今天完成了什么。",
    cost: 5,
    className: "moonCharm"
  },
  {
    id: "laurel-crown",
    name: "小桂冠",
    description: "给长期坚持的孩子一份小小荣誉。",
    cost: 6,
    className: "laurelCrown"
  }
];

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
  },
  {
    level: 5,
    title: "画笔小猫",
    form: "耳边别着小画笔，喜欢把完成的任务画成彩色贴纸。",
    skill: "完成任务后会点亮一块作品小牌。",
    unlock: "经验升到 5 级",
    className: "paint"
  },
  {
    level: 6,
    title: "侦探小猫",
    form: "戴着小领结，像在寻找下一个能完成的小目标。",
    skill: "帮助孩子把大任务拆成更小的一步。",
    unlock: "经验升到 6 级",
    className: "detective"
  },
  {
    level: 7,
    title: "太空小猫",
    form: "背着小星球包，专注时像准备发射一样精神。",
    skill: "连续专注后会给出更亮的升级反馈。",
    unlock: "经验升到 7 级",
    className: "space"
  },
  {
    level: 8,
    title: "花园小猫",
    form: "身边长出小叶子，适合记录每天一点点成长。",
    skill: "达成每日目标时会收下一片成长叶。",
    unlock: "经验升到 8 级",
    className: "garden"
  },
  {
    level: 9,
    title: "海浪小猫",
    form: "尾巴像小浪花，提醒孩子学习和休息都有节奏。",
    skill: "休息回来后会轻轻摆尾欢迎孩子继续。",
    unlock: "经验升到 9 级",
    className: "wave"
  },
  {
    level: 10,
    title: "书页小猫",
    form: "抱着一本小书，阅读任务完成后会露出认真表情。",
    skill: "记录阅读和复盘时给出温柔鼓励。",
    unlock: "经验升到 10 级",
    className: "book"
  },
  {
    level: 11,
    title: "彩虹小猫",
    form: "背后有小彩虹，每天的坚持会变成更亮的颜色。",
    skill: "连续达标时会把收藏墙变得更丰富。",
    unlock: "经验升到 11 级",
    className: "rainbow"
  },
  {
    level: 12,
    title: "月光小猫",
    form: "额头有月牙标记，适合陪孩子收尾一天的学习。",
    skill: "当天结束前提醒看看已经完成的成果。",
    unlock: "经验升到 12 级",
    className: "moon"
  },
  {
    level: 13,
    title: "勇气小猫",
    form: "披着小披风，遇到难题也会先试一小步。",
    skill: "任务需要调整时，提醒孩子这也是在学习。",
    unlock: "经验升到 13 级",
    className: "brave"
  },
  {
    level: 14,
    title: "冠军小猫",
    form: "戴着小桂冠，把长期坚持变成看得见的荣誉。",
    skill: "图鉴全亮后继续收藏学习纪念。",
    unlock: "经验升到 14 级",
    className: "champion"
  }
];

export const MAX_CAT_LEVEL = CAT_STAGES.length;

export function getCatStage(level: number): CatStage {
  return CAT_STAGES[Math.min(Math.max(level, 1), CAT_STAGES.length) - 1];
}

export function getNextCatUnlock(level: number): string {
  const next = CAT_STAGES.find((stage) => stage.level > level);
  return next ? `等级 ${next.level} 解锁${next.title}` : "小猫图鉴已经全部点亮";
}

const COLLECTION_LABELS: Record<string, string> = {
  "kitten-bell": "3 天连续纪念铃",
  "cloud-cat-bed": "7 天云朵猫窝",
  "star-whisker-badge": "14 天星光胡须章",
  "fed-kitten": "小鱼干喂养纪念",
  "playtime-spark": "陪玩闪光纪念",
  "decoration-pink-bow": "粉色蝴蝶结",
  "decoration-bell-collar": "小铃铛项圈",
  "decoration-brave-cape": "勇气披风",
  "decoration-moon-charm": "月牙挂坠",
  "decoration-laurel-crown": "小桂冠"
};

export function getCollectionLabel(id: string): string {
  return COLLECTION_LABELS[id] ?? id;
}

export function getCatDecoration(id: string): CatDecoration | undefined {
  return CAT_DECORATIONS.find((decoration) => decoration.id === id);
}
