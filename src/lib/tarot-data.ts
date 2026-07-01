export interface TarotCard {
  id: string;
  name: string;
  nameZh: string;
  element: string;
  keywords: string[];
  uprightTheme: string;
  reversedTheme: string;
  imageSymbol: string;
  color: string;
}

type TarotSeed = {
  id: string;
  name: string;
  nameZh: string;
  element: string;
  keywords: string[];
  uprightTheme: string;
  reversedTheme: string;
  imageSymbol: string;
  color: string;
};

const MAJOR_ARCANA: TarotSeed[] = [
  { id: "fool", name: "The Fool", nameZh: "愚者", element: "Air", keywords: ["开始", "自由", "冒险", "信任"], uprightTheme: "新的旅程正在展开，重要的是保持开放与勇气。", reversedTheme: "别急着往前冲，先确认自己没有忽略关键现实。", imageSymbol: "circle-with-star", color: "#F5E6C8" },
  { id: "magician", name: "The Magician", nameZh: "魔术师", element: "Mercury", keywords: ["创造", "聚焦", "行动", "资源"], uprightTheme: "你已经具备行动所需资源，现在关键在于专注和启动。", reversedTheme: "能量分散或表达失真，需要重新整合工具与意图。", imageSymbol: "wand-with-spiral", color: "#E8D5B7" },
  { id: "high-priestess", name: "The High Priestess", nameZh: "女祭司", element: "Moon", keywords: ["直觉", "安静", "潜意识", "智慧"], uprightTheme: "安静下来，答案会从更深层的感受里浮现。", reversedTheme: "别让外界噪音盖过你真正知道的事。", imageSymbol: "crescent-moon", color: "#D4C5E2" },
  { id: "empress", name: "The Empress", nameZh: "女皇", element: "Venus", keywords: ["丰盛", "滋养", "创造", "感受"], uprightTheme: "你的生命力正在生长，适合照顾、创造和接纳。", reversedTheme: "别只照顾别人，也别忽略自己真正的需要。", imageSymbol: "flower-bloom", color: "#E8C4A0" },
  { id: "emperor", name: "The Emperor", nameZh: "皇帝", element: "Aries", keywords: ["结构", "边界", "秩序", "掌控"], uprightTheme: "通过清晰的结构和边界，你会更稳定地前进。", reversedTheme: "过度控制或失去主心骨，都会让事情变僵。", imageSymbol: "geometric-mountain", color: "#D4A574" },
  { id: "hierophant", name: "The Hierophant", nameZh: "教皇", element: "Taurus", keywords: ["传统", "学习", "信念", "引导"], uprightTheme: "此刻适合向成熟的方法学习，也适合回到价值根基。", reversedTheme: "不是所有旧规则都适合你，允许自己重新定义。", imageSymbol: "pillar-arch", color: "#C4A882" },
  { id: "lovers", name: "The Lovers", nameZh: "恋人", element: "Gemini", keywords: ["选择", "关系", "价值观", "连接"], uprightTheme: "真正的选择，来自你愿意忠于什么。", reversedTheme: "内在价值冲突会让关系和决定都变得摇摆。", imageSymbol: "two-circles-union", color: "#F0C4B8" },
  { id: "chariot", name: "The Chariot", nameZh: "战车", element: "Cancer", keywords: ["推进", "意志", "方向", "胜利"], uprightTheme: "把分散的力量收拢，你会更有方向感地前进。", reversedTheme: "一边想前进一边内耗，反而最容易失速。", imageSymbol: "arrow-forward", color: "#B8C4D4" },
  { id: "strength", name: "Strength", nameZh: "力量", element: "Leo", keywords: ["耐心", "温柔", "勇气", "稳定"], uprightTheme: "真正的力量不是压制，而是温柔地稳住自己。", reversedTheme: "当你太用力时，力量反而会变成消耗。", imageSymbol: "infinity-loop", color: "#F2D4A0" },
  { id: "hermit", name: "The Hermit", nameZh: "隐者", element: "Virgo", keywords: ["独处", "探索", "沉思", "引导"], uprightTheme: "把注意力收回内在，你会找到下一步的光。", reversedTheme: "不是所有孤独都在疗愈，也可能是在回避。", imageSymbol: "lantern-light", color: "#C8D4C4" },
  { id: "wheel", name: "Wheel of Fortune", nameZh: "命运之轮", element: "Jupiter", keywords: ["转折", "周期", "机遇", "流动"], uprightTheme: "变化已经启动，顺势而行会比硬撑更有效。", reversedTheme: "如果你死抓住旧位置，就会错过正在转动的门。", imageSymbol: "spiral-circle", color: "#D4C0A8" },
  { id: "justice", name: "Justice", nameZh: "正义", element: "Libra", keywords: ["公平", "真相", "选择", "责任"], uprightTheme: "诚实面对现实，才有可能做出真正平衡的决定。", reversedTheme: "模糊事实或逃避责任，会让结果继续失衡。", imageSymbol: "balance-scale", color: "#C4D4E0" },
  { id: "hanged-man", name: "The Hanged Man", nameZh: "倒吊人", element: "Neptune", keywords: ["暂停", "转换", "等待", "视角"], uprightTheme: "暂停不是停滞，而是在换一个角度看清楚。", reversedTheme: "如果只是卡住不动，那就不是有意识的停顿。", imageSymbol: "inverted-figure", color: "#B8C8D8" },
  { id: "death", name: "Death", nameZh: "死神", element: "Scorpio", keywords: ["结束", "转化", "释放", "重生"], uprightTheme: "旧阶段该结束了，放下才有新空间。", reversedTheme: "抗拒结束会延长真正该离开的东西。", imageSymbol: "phoenix-symbol", color: "#C4B8C0" },
  { id: "temperance", name: "Temperance", nameZh: "节制", element: "Sagittarius", keywords: ["平衡", "调和", "耐心", "流动"], uprightTheme: "一切不必太急，调和比强推更有效。", reversedTheme: "过量、过激或过急，都会让节奏失衡。", imageSymbol: "two-vessels-flow", color: "#D4E0D4" },
  { id: "devil", name: "The Devil", nameZh: "恶魔", element: "Capricorn", keywords: ["束缚", "执念", "欲望", "投射"], uprightTheme: "那些困住你的东西，可能没有你想的那么牢。", reversedTheme: "你正在慢慢看见并松开旧有捆绑。", imageSymbol: "chain-loop", color: "#D4C4B8" },
  { id: "tower", name: "The Tower", nameZh: "高塔", element: "Mars", keywords: ["突变", "真相", "崩塌", "解放"], uprightTheme: "虽然震动强烈，但它正在帮你拆掉不真实的部分。", reversedTheme: "如果只是拖延崩塌，冲击并不会真的消失。", imageSymbol: "lightning-bolt", color: "#D4B8A0" },
  { id: "star", name: "The Star", nameZh: "星星", element: "Aquarius", keywords: ["希望", "修复", "宁静", "指引"], uprightTheme: "在经历混乱之后，你正在重新找回希望和方向。", reversedTheme: "别因为短暂看不见，就怀疑光已经不存在。", imageSymbol: "eight-point-star", color: "#C8D8E8" },
  { id: "moon", name: "The Moon", nameZh: "月亮", element: "Pisces", keywords: ["迷雾", "感受", "梦境", "潜流"], uprightTheme: "不是一切都要立刻看清，先允许自己感受。", reversedTheme: "迷雾正在散开，某些真相开始显形。", imageSymbol: "crescent-path", color: "#D4C4D8" },
  { id: "sun", name: "The Sun", nameZh: "太阳", element: "Sun", keywords: ["清晰", "生命力", "喜悦", "表达"], uprightTheme: "你可以更坦荡地发光，也更适合主动表达。", reversedTheme: "别把热情压回去，也别只靠外界掌声确认自己。", imageSymbol: "radiant-circle", color: "#F5D87C" },
  { id: "judgement", name: "Judgement", nameZh: "审判", element: "Pluto", keywords: ["召唤", "觉醒", "决定", "回响"], uprightTheme: "现在适合回应内在真正的召唤。", reversedTheme: "不要一直拖延那个你早就知道该面对的决定。", imageSymbol: "rising-figure", color: "#C0C8D4" },
  { id: "world", name: "The World", nameZh: "世界", element: "Saturn", keywords: ["完成", "整合", "实现", "圆满"], uprightTheme: "一个重要循环正在完成，你已准备好进入下一章。", reversedTheme: "你离完成很近了，别在最后一步停下。", imageSymbol: "wreath-circle", color: "#C8D4C0" },
];

const SUIT_CONFIG = {
  cups: { zh: "圣杯", element: "Water", color: "#8EC5E8", aceId: "ace-cups", pages: ["page-cups", "knight-cups", "queen-cups", "king-cups"] },
  pentacles: { zh: "星币", element: "Earth", color: "#D9B56D", aceId: "ace-pentacles", pages: ["page-pentacles", "knight-pentacles", "queen-pentacles", "king-pentacles"] },
  swords: { zh: "宝剑", element: "Air", color: "#B8C7D9", aceId: "ace-swords", pages: ["page-swords", "knight-swords", "queen-swords", "king-swords"] },
  wands: { zh: "权杖", element: "Fire", color: "#D89C62", aceId: "ace-wands", pages: ["page-wands", "knight-wands", "queen-wands", "king-wands"] },
} as const;

const MINOR_RANKS = [
  { key: "ace", name: "Ace", zh: "一", keywords: ["种子", "机会", "起点"], upright: "新的能量种子出现了，值得认真接住。", reversed: "机会还在，但需要更踏实地承接。 " },
  { key: "two", name: "Two", zh: "二", keywords: ["选择", "平衡", "互动"], upright: "你正在学习如何在两种力量之间取得平衡。", reversed: "摇摆与犹豫，说明你还没真正对齐自己的立场。" },
  { key: "three", name: "Three", zh: "三", keywords: ["展开", "协作", "生长"], upright: "事情开始展开，也需要更多协同与交流。", reversed: "节奏散了，或合作里的期待还没有对齐。" },
  { key: "four", name: "Four", zh: "四", keywords: ["稳定", "停留", "基础"], upright: "先把位置站稳，再谈更大的推进。", reversed: "太久不动会变成停滞，稳定也需要更新。" },
  { key: "five", name: "Five", zh: "五", keywords: ["冲突", "波动", "磨合"], upright: "一些摩擦正在逼你看清真正的问题。", reversed: "别一直耗在冲突里，重点是找到出口。" },
  { key: "six", name: "Six", zh: "六", keywords: ["过渡", "流动", "回馈"], upright: "你正在穿过一个过渡带，也会收到回应。", reversed: "如果只停在过去，过渡就无法真正完成。" },
  { key: "seven", name: "Seven", zh: "七", keywords: ["考验", "辨别", "坚持"], upright: "不是所有表象都可信，需要更清楚地辨别。", reversed: "别把精力耗在怀疑和防御里，先回到核心。" },
  { key: "eight", name: "Eight", zh: "八", keywords: ["推进", "专注", "变化"], upright: "事情在加速，需要你更专注地跟上节奏。", reversed: "步伐被打乱时，先重建顺序感。" },
  { key: "nine", name: "Nine", zh: "九", keywords: ["累积", "成熟", "临界点"], upright: "你已经走到接近完成的位置，继续稳住。", reversed: "疲惫或担心让你忘了自己已走了多远。" },
  { key: "ten", name: "Ten", zh: "十", keywords: ["完成", "极点", "总结"], upright: "一个阶段来到顶点，结尾也意味着转场。", reversed: "负担过重时，结束反而是一种释放。" },
];

const COURT_RANKS = [
  { key: "page", name: "Page", zh: "侍从", keywords: ["消息", "学习", "好奇"], upright: "保持好奇和开放，新的讯息正在靠近。", reversed: "别把灵感只停在想象里，试着让它落地。" },
  { key: "knight", name: "Knight", zh: "骑士", keywords: ["行动", "推进", "冲劲"], upright: "现在适合带着明确方向往前推。", reversed: "冲太快容易失衡，行动前先校准节奏。" },
  { key: "queen", name: "Queen", zh: "王后", keywords: ["成熟", "感受", "内在掌控"], upright: "你正拥有一种更稳、更成熟的掌控力。", reversed: "别让情绪或控制欲抢走了真正的稳定。" },
  { key: "king", name: "King", zh: "国王", keywords: ["领导", "决断", "整合"], upright: "是时候以更清晰的方式整合和主导局面。", reversed: "权威感若失去柔软，就会变成压迫。" },
];

function buildMinorArcana(): TarotCard[] {
  const cards: TarotCard[] = [];

  Object.entries(SUIT_CONFIG).forEach(([suitKey, suit]) => {
    MINOR_RANKS.forEach((rank, index) => {
      const numberName = index === 0 ? "Ace" : String(index + 1);
      const displayName = index === 0 ? `Ace of ${capitalize(suitKey)}` : `${numberName} of ${capitalize(suitKey)}`;
      const displayZh = `${suit.zh}${rank.zh}`;
      cards.push({
        id: index === 0 ? suit.aceId : `${rank.key}-${suitKey}`,
        name: displayName,
        nameZh: displayZh,
        element: suit.element,
        keywords: [...rank.keywords, suit.zh],
        uprightTheme: `${suit.zh}的主题来到台前。${rank.upright}`,
        reversedTheme: `${suit.zh}的课题仍在，但表达方式出现偏差。${rank.reversed.trim()}`,
        imageSymbol: `${suitKey}-${rank.key}`,
        color: suit.color,
      });
    });

    COURT_RANKS.forEach((rank) => {
      cards.push({
        id: `${rank.key}-${suitKey}`,
        name: `${rank.name} of ${capitalize(suitKey)}`,
        nameZh: `${suit.zh}${rank.zh}`,
        element: suit.element,
        keywords: [...rank.keywords, suit.zh],
        uprightTheme: `${suit.zh}的能量正在以更成熟的方式表达。${rank.upright}`,
        reversedTheme: `${suit.zh}的能量暂时失衡。${rank.reversed}`,
        imageSymbol: `${suitKey}-${rank.key}`,
        color: suit.color,
      });
    });
  });

  return cards;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const TAROT_CARDS: TarotCard[] = [...MAJOR_ARCANA, ...buildMinorArcana()];

const MAJOR_IMAGE_INDEX: Record<string, number> = Object.fromEntries(
  MAJOR_ARCANA.map((card, index) => [card.id, index]),
);

const MINOR_SUIT_PREFIX: Record<string, string> = {
  cups: "Cups",
  pentacles: "Pents",
  swords: "Swords",
  wands: "Wands",
};

const MINOR_RANK_INDEX: Record<string, string> = {
  ace: "01",
  two: "02",
  three: "03",
  four: "04",
  five: "05",
  six: "06",
  seven: "07",
  eight: "08",
  nine: "09",
  ten: "10",
  page: "11",
  knight: "12",
  queen: "13",
  king: "14",
};

// Local RWS tarot card images served by Next.js from /tarot/{cardId}.jpg
// To download: python scripts/download-tarot-images.py
// Falls back to inline SVG in CardFront component if image fails to load.
export function getTarotCardImageUrl(cardId: string): string {
  return `/tarot/${cardId}.jpg`;
}


export const ASTROLOGY_ICONS: Record<string, string> = {
  "sun-aries": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M9 9a3 3 0 1 0 6 0",
  "sun-taurus": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M8 8h8 M12 8v4",
  "sun-gemini": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M8 8h2 M14 8h2 M10 11h4",
  "sun-cancer": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M7 10a3 3 0 0 1 5-2 M12 8a3 3 0 0 1 5 2",
  "sun-leo": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M12 6l2 2-2 2-2-2z",
  "sun-virgo": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M9 8l3 3 3-3",
  "sun-libra": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M7 9h10 M7 12h10",
  "sun-scorpio": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M9 9v3 M15 9v3 M9 14h6",
  "moon-full": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z",
  "moon-new": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 4a8 8 0 0 1 0 16 6 6 0 0 0 0-16z",
  "mercury-rx": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M15 6l-6 6 M9 6l6 6",
  "venus-direct": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M10 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0z M12 9v3",
  "mars-direct": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M14 7l-2 2 2 2 M14 9h-4",
  "jupiter-transit": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M7 10l2-4 2 4 2-4 2 4",
  "saturn-return": "M12 2C8 2 5 5 5 9c0 3 2 5 5 5h4c3 0 5-2 5-5 0-4-3-7-7-7z M12 16v4 M8 22h8 M9 9h6 M9 12h6",
};

export const ASTROLOGY_TAGS = [
  { id: "sun-aries", name: "太阳入白羊", description: "行动力旺盛，适合点燃新的开始。" },
  { id: "sun-taurus", name: "太阳入金牛", description: "更需要稳定、踏实和可持续的推进方式。" },
  { id: "sun-gemini", name: "太阳入双子", description: "思路活跃，适合沟通、连接与吸收新信息。" },
  { id: "sun-cancer", name: "太阳入巨蟹", description: "情绪与安全感议题变得更重要。" },
  { id: "sun-leo", name: "太阳入狮子", description: "自我表达欲增强，适合站到自己的位置上。" },
  { id: "sun-virgo", name: "太阳入处女", description: "适合整理细节、打磨结构和照顾日常秩序。" },
  { id: "sun-libra", name: "太阳入天秤", description: "关系、审美与平衡感会更被看见。" },
  { id: "sun-scorpio", name: "太阳入天蝎", description: "更适合深入、转化和面对真实情绪。" },
  { id: "moon-full", name: "满月", description: "情绪能量达到峰值，适合完成与释放。" },
  { id: "moon-new", name: "新月", description: "新的周期刚刚开始，适合许愿与种下意图。" },
  { id: "mercury-rx", name: "水星逆行", description: "适合复盘、修正和重新确认细节。" },
  { id: "venus-direct", name: "金星顺行", description: "关系和感受表达更顺畅，也更能接住美好。" },
  { id: "mars-direct", name: "火星顺行", description: "行动力恢复，适合推进搁置计划。" },
  { id: "jupiter-transit", name: "木星课题", description: "机会与扩张感增强，也提醒你拓展视野。" },
  { id: "saturn-return", name: "土星课题", description: "责任、边界和长期积累开始显出重量。" },
];

import astrologySummariesData from "./astrology-summaries.json";

/** 根据月相名和星象标签名查找定制的一行摘要 */
export function getAstrologySummary(moonPhaseName: string, astrologyTagName: string): string {
  return (astrologySummariesData as Record<string, Record<string, string>>)?.[moonPhaseName]?.[astrologyTagName]
    ?? `${moonPhaseName}当值，${astrologyTagName}带来顺势而行的提醒。`;
}

export function getTodayAstrology(date = new Date()): { id: string; name: string; description: string; icon: string } {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const tag = ASTROLOGY_TAGS[dayOfYear % ASTROLOGY_TAGS.length];
  return { ...tag, icon: ASTROLOGY_ICONS[tag.id] || "" };
}

export function getRandomCard(exclude?: Set<string>): TarotCard {
  if (exclude && exclude.size < TAROT_CARDS.length) {
    const available = TAROT_CARDS.filter((card) => !exclude.has(card.id));
    return available[Math.floor(Math.random() * available.length)];
  }
  return TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
}

export function getCardById(id: string): TarotCard | undefined {
  return TAROT_CARDS.find((card) => card.id === id);
}
