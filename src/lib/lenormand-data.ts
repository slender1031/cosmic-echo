export interface LenormandCard {
  id: string;
  number: number;
  name: string;
  nameZh: string;
  suit: string;
  keywords: string[];
  uprightTheme: string;
  reversedTheme: string;
  color: string;
}

export const LENORMAND_CARDS: LenormandCard[] = [
  { id: "rider",       number: 1,  name: "Rider",       nameZh: "骑士",   suit: "hearts",   keywords: ["消息","行动","来访"],        uprightTheme: "新的消息或访客即将到来",  reversedTheme: "消息延误或来者不善",   color: "#c8708a" },
  { id: "clover",      number: 2,  name: "Clover",      nameZh: "三叶草", suit: "diamonds", keywords: ["幸运","机遇","小确幸"],      uprightTheme: "幸运正在靠近，抓住机会",  reversedTheme: "错失良机或短暂好运",   color: "#7C9A6F" },
  { id: "ship",        number: 3,  name: "Ship",        nameZh: "船",     suit: "spades",   keywords: ["旅程","远行","转变"],        uprightTheme: "一段旅程或新的冒险开启",  reversedTheme: "行程受阻或不愿改变",   color: "#6A88C8" },
  { id: "house",       number: 4,  name: "House",       nameZh: "房子",   suit: "hearts",   keywords: ["家庭","安全感","根基"],      uprightTheme: "家庭和谐与内在安全感",    reversedTheme: "家庭纷争或不稳定",     color: "#D4A55A" },
  { id: "tree",        number: 5,  name: "Tree",        nameZh: "树",     suit: "hearts",   keywords: ["成长","健康","生命力"],      uprightTheme: "稳步成长，健康良好",      reversedTheme: "成长停滞或健康问题",   color: "#7C9A6F" },
  { id: "clouds",      number: 6,  name: "Clouds",      nameZh: "云",     suit: "clubs",    keywords: ["困惑","不确定","迷雾"],      uprightTheme: "困惑终将散去，保持耐心",  reversedTheme: "长期迷茫或判断失误",   color: "#9794a2" },
  { id: "snake",       number: 7,  name: "Snake",       nameZh: "蛇",     suit: "clubs",    keywords: ["智慧","诱惑","复杂"],        uprightTheme: "用智慧化解复杂局面",      reversedTheme: "欺骗或暗中算计",       color: "#7C9A6F" },
  { id: "coffin",      number: 8,  name: "Coffin",      nameZh: "棺材",   suit: "diamonds", keywords: ["结束","转变","放下"],        uprightTheme: "一个阶段的结束，新生的开始", reversedTheme: "抗拒结束或拖泥带水",  color: "#5c5a64" },
  { id: "bouquet",     number: 9,  name: "Bouquet",     nameZh: "花束",   suit: "spades",   keywords: ["喜悦","欣赏","礼物"],        uprightTheme: "收到赞美或美好的礼物",    reversedTheme: "虚伪的奉承或期待落空", color: "#c8708a" },
  { id: "scythe",      number: 10, name: "Scythe",      nameZh: "镰刀",   suit: "diamonds", keywords: ["决断","收割","危险"],        uprightTheme: "果断决定，割舍不必要的",  reversedTheme: "犹豫不决或意外伤害",   color: "#D4A55A" },
  { id: "whip",        number: 11, name: "Whip",        nameZh: "鞭子",   suit: "clubs",    keywords: ["冲突","重复","动力"],        uprightTheme: "直面冲突，化为前进动力",  reversedTheme: "无谓争吵或自我惩罚",   color: "#c8708a" },
  { id: "birds",       number: 12, name: "Birds",       nameZh: "鸟",     suit: "diamonds", keywords: ["沟通","闲聊","焦虑"],        uprightTheme: "沟通顺畅，信息流通",      reversedTheme: "流言蜚语或沟通不畅",   color: "#6A88C8" },
  { id: "child",       number: 13, name: "Child",       nameZh: "小孩",   suit: "spades",   keywords: ["纯真","新开始","天真"],      uprightTheme: "以纯真之心开始新事物",    reversedTheme: "幼稚行为或不成熟",     color: "#c8708a" },
  { id: "fox",         number: 14, name: "Fox",         nameZh: "狐狸",   suit: "clubs",    keywords: ["警惕","狡猾","自保"],        uprightTheme: "保持警惕，灵活应对",      reversedTheme: "被人利用或自欺欺人",   color: "#D4A55A" },
  { id: "bear",        number: 15, name: "Bear",        nameZh: "熊",     suit: "clubs",    keywords: ["力量","权威","保护"],        uprightTheme: "展现内在力量，守护所爱",  reversedTheme: "滥用权力或过于强势",   color: "#5c5a64" },
  { id: "stars",       number: 16, name: "Stars",       nameZh: "星星",   suit: "hearts",   keywords: ["希望","指引","梦想"],        uprightTheme: "星光指引方向，心怀希望",  reversedTheme: "迷失方向或失去希望",   color: "#9888B0" },
  { id: "stork",       number: 17, name: "Stork",       nameZh: "鹳",     suit: "hearts",   keywords: ["变化","升级","新生"],        uprightTheme: "积极的转变正在发生",      reversedTheme: "抗拒变化或停滞不前",   color: "#c8708a" },
  { id: "dog",         number: 18, name: "Dog",         nameZh: "狗",     suit: "hearts",   keywords: ["忠诚","友谊","信任"],        uprightTheme: "忠诚的友谊和可靠的支持",  reversedTheme: "背叛或信任危机",       color: "#D4A55A" },
  { id: "tower",       number: 19, name: "Tower",       nameZh: "塔",     suit: "spades",   keywords: ["孤独","权威","边界"],        uprightTheme: "独自坚守，保持边界",      reversedTheme: "孤立无援或傲慢自大",   color: "#6A88C8" },
  { id: "garden",      number: 20, name: "Garden",      nameZh: "花园",   suit: "spades",   keywords: ["社交","公众","集会"],        uprightTheme: "社交活跃，人脉扩展",      reversedTheme: "社交疲惫或被排斥",     color: "#7C9A6F" },
  { id: "mountain",    number: 21, name: "Mountain",    nameZh: "山",     suit: "clubs",    keywords: ["障碍","挑战","坚持"],        uprightTheme: "面对挑战，坚持攀登",      reversedTheme: "被障碍压垮或逃避",     color: "#5c5a64" },
  { id: "crossroads",  number: 22, name: "Crossroads",  nameZh: "十字路口", suit: "diamonds", keywords: ["选择","决定","方向"],      uprightTheme: "关键时刻需做出选择",      reversedTheme: "犹豫不决或选错方向",   color: "#D4A55A" },
  { id: "mice",        number: 23, name: "Mice",        nameZh: "老鼠",   suit: "clubs",    keywords: ["损耗","焦虑","偷窃"],        uprightTheme: "注意损耗，及时止损",      reversedTheme: "持续消耗或精神压力",   color: "#9794a2" },
  { id: "heart",       number: 24, name: "Heart",       nameZh: "心",     suit: "hearts",   keywords: ["爱情","情感","喜悦"],        uprightTheme: "爱意满满，情感丰收",      reversedTheme: "心碎或情感匮乏",       color: "#c8708a" },
  { id: "ring",        number: 25, name: "Ring",        nameZh: "戒指",   suit: "diamonds", keywords: ["承诺","契约","循环"],        uprightTheme: "承诺与约定的建立",        reversedTheme: "契约破裂或承诺落空",   color: "#6A88C8" },
  { id: "book",        number: 26, name: "Book",        nameZh: "书",     suit: "spades",   keywords: ["知识","秘密","学习"],        uprightTheme: "知识带来启示，深入探究",  reversedTheme: "秘密未知或知识盲区",   color: "#9888B0" },
  { id: "letter",      number: 27, name: "Letter",      nameZh: "信",     suit: "spades",   keywords: ["文件","消息","通信"],        uprightTheme: "重要文件或消息即将到来",  reversedTheme: "消息丢失或文件出错",   color: "#7C9A6F" },
  { id: "man",         number: 28, name: "Man",         nameZh: "男人",   suit: "hearts",   keywords: ["男性","主动","理性"],        uprightTheme: "一个重要的男性角色出现",  reversedTheme: "男性特质的负面影响",   color: "#6A88C8" },
  { id: "woman",       number: 29, name: "Woman",       nameZh: "女人",   suit: "hearts",   keywords: ["女性","直觉","滋养"],        uprightTheme: "一个重要的女性角色出现",  reversedTheme: "女性特质的负面影响",   color: "#c8708a" },
  { id: "lily",        number: 30, name: "Lily",        nameZh: "百合",   suit: "spades",   keywords: ["纯洁","平和","智慧"],        uprightTheme: "内心平和，智慧绽放",      reversedTheme: "内心不安或智慧被遮蔽", color: "#9888B0" },
  { id: "sun",         number: 31, name: "Sun",         nameZh: "太阳",   suit: "diamonds", keywords: ["成功","活力","幸福"],        uprightTheme: "阳光灿烂，成功在望",      reversedTheme: "暂时阴霾或信心不足",   color: "#D4A55A" },
  { id: "moon",        number: 32, name: "Moon",        nameZh: "月亮",   suit: "hearts",   keywords: ["直觉","潜意识","名声"],      uprightTheme: "跟随直觉，探索潜意识",    reversedTheme: "恐惧幻想或名声受损",   color: "#9888B0" },
  { id: "key",         number: 33, name: "Key",         nameZh: "钥匙",   suit: "diamonds", keywords: ["答案","解锁","关键"],        uprightTheme: "答案即将揭晓，打开新门",  reversedTheme: "找不到答案或受困",     color: "#D4A55A" },
  { id: "fish",        number: 34, name: "Fish",        nameZh: "鱼",     suit: "diamonds", keywords: ["财富","丰盛","流动"],        uprightTheme: "财富与丰盛正在流动",      reversedTheme: "财务损失或资源枯竭",   color: "#6A88C8" },
  { id: "anchor",      number: 35, name: "Anchor",      nameZh: "锚",     suit: "spades",   keywords: ["稳定","坚持","安全"],        uprightTheme: "稳固根基，无惧风浪",      reversedTheme: "漂泊不定或缺乏安全",   color: "#5c5a64" },
  { id: "cross",       number: 36, name: "Cross",       nameZh: "十字架", suit: "clubs",    keywords: ["使命","信仰","负担"],        uprightTheme: "承载使命，坚定前行",      reversedTheme: "沉重负担或信仰危机",   color: "#9794a2" },
];

export function getLenormandCardById(id: string): LenormandCard | undefined {
  return LENORMAND_CARDS.find((c) => c.id === id);
}

export function getRandomLenormandCards(count: number): Array<{ card: LenormandCard; orientation: "upright" | "reversed" }> {
  const shuffled = [...LENORMAND_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, LENORMAND_CARDS.length)).map((card) => ({
    card,
    orientation: "upright",
  }));
}

export function getLenormandCardImageUrl(cardId: string): string {
  return `/lenormand/${cardId}.jpg`;
}
