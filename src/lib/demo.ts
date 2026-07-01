import { nanoid } from "nanoid";
import { getCardById, getRandomCard, getTodayAstrology, type TarotCard } from "@/lib/tarot-data";
import { getLenormandCardById, getRandomLenormandCards, type LenormandCard } from "@/lib/lenormand-data";

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_USER = {
  id: "demo-user",
  name: "Demo Explorer",
  email: "demo@cosmic-echo.local",
  avatarUrl: "",
};

interface SeedCard {
  cardId: string;
  cardName: string;
  cardOrientation: string;
}

export interface DemoJournalEntry {
  id: string;
  userId: string;
  date: string;
  cardId: string;
  cardName: string;
  cardOrientation: string;
  cards?: { cardId: string; cardName: string; cardOrientation: "upright" | "reversed" }[];
  cardSystem?: string;
  astrologyTag: string;
  astrologyDescription: string;
  morningTheme: string | null;
  morningQuestion: string | null;
  morningQuestionDescription: string | null;
  journalText: string | null;
  eveningSummary: string | null;
  behaviorPatterns: string | null;
  patternMapping: string | null;
  eveningEcho: string | null;
  // Score deltas from AI analysis (for rollback on delete)
  stabilityDelta?: number | null;
  explorationDelta?: number | null;
  introspectionDelta?: number | null;
  actionDelta?: number | null;
  isComplete: boolean;
  morningDrawnAt?: Date;
  journalSubmittedAt?: Date;
  updatedAt?: Date;
  streakDay?: number;
}

type DemoStore = {
  entries: DemoJournalEntry[];
};

const globalForDemo = globalThis as typeof globalThis & {
  __cosmicEchoDemoStore?: DemoStore;
};

function getStore(): DemoStore {
  if (!globalForDemo.__cosmicEchoDemoStore) {
    globalForDemo.__cosmicEchoDemoStore = { entries: seedEntries() };
  }
  return globalForDemo.__cosmicEchoDemoStore;
}

/** Serialize the current demo store for external persistence */
export function getStoreSnapshot(): DemoStore {
  return getStore();
}

/** Restore demo store from a previously-persisted snapshot */
export function restoreStoreSnapshot(snapshot: DemoStore) {
  globalForDemo.__cosmicEchoDemoStore = snapshot;
}

function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

function seedEntries(): DemoJournalEntry[] {
  return [];
}

export function listDemoEntries(userId: string) {
  return getStore().entries
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getDemoEntryByDate(userId: string, date: string) {
  return getStore().entries.find((entry) => entry.userId === userId && entry.date === date) ?? null;
}

export function createDemoEntry(
  userId: string,
  cardIds?: string[],
  reset?: boolean,
  targetDate?: string,
  requestedCards?: Array<{ cardId: string; orientation?: "upright" | "reversed" }>,
  cardSystem?: string,
) {
  const date = targetDate ?? today();
  const store = getStore();
  const existing = getDemoEntryByDate(userId, date);
  if (existing && !reset) return existing;
  if (existing && reset) {
    store.entries = store.entries.filter((entry) => entry.id !== existing.id);
  }
  const astrology = getTodayAstrology(new Date(`${date}T00:00:00`));
  const count = cardIds?.length ?? 1;
  const drawnCards: { cardId: string; cardName: string; cardOrientation: "upright" | "reversed" }[] = [];
  const usedIds = new Set<string>();
  const useLenormand = cardSystem === "lenormand";

  for (let i = 0; i < count; i++) {
    let cardName: string;
    let cardId: string;
    if (useLenormand) {
      let card: LenormandCard;
      if (cardIds && cardIds[i]) {
        card = getLenormandCardById(cardIds[i]) ?? getRandomLenormandCards(1)[0].card;
      } else {
        card = getRandomLenormandCards(1)[0].card;
        while (usedIds.has(card.id)) {
          card = getRandomLenormandCards(1)[0].card;
        }
      }
      cardId = card.id;
      cardName = card.nameZh;
    } else {
      let card: TarotCard;
      if (cardIds && cardIds[i]) {
        card = getCardById(cardIds[i]) ?? getRandomCard(usedIds);
      } else {
        card = getRandomCard(usedIds);
      }
      cardId = card.id;
      cardName = card.nameZh;
    }
    usedIds.add(cardId);
    const requestedOrientation = requestedCards?.[i]?.orientation;
    const orientation: "upright" | "reversed" =
      useLenormand
        ? "upright"
        : requestedOrientation === "upright" || requestedOrientation === "reversed"
          ? requestedOrientation
          : Math.random() > 0.8
            ? "reversed"
            : "upright";
    drawnCards.push({ cardId, cardName, cardOrientation: orientation });
  }

  const primary = drawnCards[0];
  const entry: DemoJournalEntry = {
    id: nanoid(),
    userId,
    date,
    cardId: primary.cardId,
    cardName: primary.cardName,
    cardOrientation: primary.cardOrientation,
    cards: drawnCards,
    cardSystem: cardSystem ?? "tarot",
    astrologyTag: astrology.name,
    astrologyDescription: astrology.description,
    morningTheme: null,
    morningQuestion: null,
    morningQuestionDescription: null,
    journalText: null,
    eveningSummary: null,
    behaviorPatterns: null,
    patternMapping: null,
    eveningEcho: null,
    isComplete: false,
    morningDrawnAt: new Date(),
    streakDay: 1,
  };
  store.entries.push(entry);
  return entry;
}

export function updateDemoEntry(id: string, userId: string, updates: Partial<DemoJournalEntry>) {
  const store = getStore();
  const index = store.entries.findIndex((entry) => entry.id === id && entry.userId === userId);
  if (index === -1) return null;
  const updated: DemoJournalEntry = { ...store.entries[index], ...updates, updatedAt: new Date() } as DemoJournalEntry;
  store.entries[index] = updated;
  return { ...updated }; // return a fresh reference so React re-renders
}

export function deleteDemoEntry(id: string, userId: string) {
  const store = getStore();
  const before = store.entries.length;
  store.entries = store.entries.filter((entry) => !(entry.id === id && entry.userId === userId));
  return store.entries.length < before;
}

export function getDemoStreak(userId: string) {
  const entries = listDemoEntries(userId).filter((entry) => entry.isComplete);
  let streak = 0;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].date !== today(-i)) break;
    streak++;
  }
  return streak;
}

// ─── 月相类型分类 ─────────────────────────────────────────────
type MoonPhaseType = "new" | "growing" | "full" | "waning";

function classifyMoonPhase(moonPhase: string): MoonPhaseType {
  if (moonPhase === "新月" || moonPhase === "蛾眉月") return "new";
  if (moonPhase === "上弦月" || moonPhase === "盈凸月") return "growing";
  if (moonPhase === "满月" || moonPhase === "亏凸月") return "full";
  return "waning"; // 下弦月、残月
}

// ─── 按月相类型分组的金句内容池 ───────────────────────────────
// morningTheme 15-25字，morningQuestion 15-25字，morningQuestionDescription 25-40字
const morningContentPool: Record<MoonPhaseType, Array<{
  morningTheme: string;
  morningQuestion: string;
  morningQuestionDescription: string;
}>> = {
  new: [
    {
      morningTheme: "新月的暗处，正孕育着一颗新的种子",
      morningQuestion: "你想在这个新周期里为自己种下什么意图？",
      morningQuestionDescription: "不必急着看到结果，\n先让种子在土里安静安顿好，等它萌发。",
    },
    {
      morningTheme: "清空旧有的，才能为新的事物腾出空间",
      morningQuestion: "今天最需要放下的是哪一种执念？",
      morningQuestionDescription: "紧握的拳头永远打不开，\n松开才能接住即将到来的礼物。",
    },
    {
      morningTheme: "从一片空白开始，允许自己不被定义",
      morningQuestion: "如果抛开所有期待，你会怎样选择？",
      morningQuestionDescription: "空白并不是空无，\n而是还没被书写的可能性正在等你落笔。",
    },
    {
      morningTheme: "给自己一个温柔的起点，不必想好全程",
      morningQuestion: "今天可以迈出的第一个小步是什么？",
      morningQuestionDescription: "不需要把整条路都规划好，\n先迈出脚下的这一步就已经足够了。",
    },
    {
      morningTheme: "在看不见的地方积蓄，是生长的前奏",
      morningQuestion: "有什么正在暗处悄悄地生根发芽？",
      morningQuestionDescription: "看不见的根系正在为你扎下深基，\n耐心等它破土而出的那天。",
    },
  ],
  growing: [
    {
      morningTheme: "行动比完美更重要，先让自己动起来",
      morningQuestion: "是什么在阻碍你迈出那关键的一步？",
      morningQuestionDescription: "完成永远比完美更重要，\n先让自己进入行动的状态再说。",
    },
    {
      morningTheme: "在不确定中前行，本身就是一种勇气",
      morningQuestion: "你愿意为自己冒一次怎样的风险？",
      morningQuestionDescription: "不确定并不是危险的信号，\n而是还没被拆开的礼物在等你。",
    },
    {
      morningTheme: "让节奏稳定下来，比加快速度更重要",
      morningQuestion: "你怎样能让自己走得更稳也更远？",
      morningQuestionDescription: "不是跑得最快的人才能赢，\n而是知道何时该慢下来的人。",
    },
    {
      morningTheme: "用果断的选择代替反复的犹豫和权衡",
      morningQuestion: "你还在等待什么样的外部确认信号？",
      morningQuestionDescription: "信号其实一直在你心里，\n不需要从外面去寻找任何确认。",
    },
    {
      morningTheme: "把散落的碎片拼起来，看见完整的形状",
      morningQuestion: "最近有哪些线索可以串联成整体？",
      morningQuestionDescription: "散落的碎片正在慢慢归位，\n试着退后一步去看完整的全貌。",
    },
  ],
  full: [
    {
      morningTheme: "满月照亮你已经拥有的丰盛与成就",
      morningQuestion: "此刻什么已经在你手里开花结果了？",
      morningQuestionDescription: "低头看看脚下走过的路，\n你迈出的每一步都已经开出了花。",
    },
    {
      morningTheme: "满月的光也在照见需要释放的东西",
      morningQuestion: "有什么不再属于你，是时候放手了？",
      morningQuestionDescription: "腾出双手才能接住新的到来，\n放手不是失去而是一种清理。",
    },
    {
      morningTheme: "情绪在满月时涨潮，需要被看见和接纳",
      morningQuestion: "有什么情绪正在你的内心里涌动？",
      morningQuestionDescription: "不必压住翻涌的感受，\n允许它流过你，而不是将它困在心里。",
    },
    {
      morningTheme: "在圆满中诚实面对那些未完成的遗憾",
      morningQuestion: "你的生命里哪里还藏着不愿承认的缺口？",
      morningQuestionDescription: "圆满并不是没有缺憾，\n而是看见缺口之后仍然选择去接纳。",
    },
    {
      morningTheme: "满月的光照到了一直被回避的暗处",
      morningQuestion: "什么被照亮了，正等待你去直面？",
      morningQuestionDescription: "那些一直假装看不见的东西，\n现在终于到了该认真面对的时候。",
    },
  ],
  waning: [
    {
      morningTheme: "向内收拢，在安静中听见自己的声音",
      morningQuestion: "当外界安静下来，你的内心在说什么？",
      morningQuestionDescription: "当外界的嘈杂退潮之后，\n你才听得见心底真正想对你说的话。",
    },
    {
      morningTheme: "整理比开始更重要，梳理才能看清",
      morningQuestion: "有什么需要被好好地梳理和归整？",
      morningQuestionDescription: "把散落的线头一一收好，\n你才能织出下一个完整的图案。",
    },
    {
      morningTheme: "允许自己慢下来，不是停而是换种走法",
      morningQuestion: "你有多久没有真正给自己喘息了？",
      morningQuestionDescription: "慢并不是停滞不前，\n而是换一种更可持续的方式继续往前走。",
    },
    {
      morningTheme: "在结束中找到完整，而非只看到失去",
      morningQuestion: "有什么正在自然地画上一个句号？",
      morningQuestionDescription: "结束并不是失败的标记，\n而是一个周期走完之后属于你的圆满。",
    },
    {
      morningTheme: "归还不属于你的重量，轻装才能走远",
      morningQuestion: "有什么担子其实从来都不属于你？",
      morningQuestionDescription: "卸下别人投射过来的期待，\n带着自己的节奏轻装往前走。",
    },
  ],
};

function hashText(input: string) {
  return Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function generateDemoMorning(
  cards: { cardName: string; orientation: string }[],
  moonPhase?: string,
  _astrologyTag?: string,
) {
  const phaseType = classifyMoonPhase(moonPhase ?? "");
  const pool = morningContentPool[phaseType];
  const signature = cards.map((card) => `${card.cardName}:${card.orientation}`).join("|");
  const base = pool[hashText(signature) % pool.length];

  return {
    morningTheme: base.morningTheme,
    morningQuestion: base.morningQuestion,
    morningQuestionDescription: base.morningQuestionDescription,
  };
}

export function generateDemoEvening(morningTheme: string, journalText: string) {
  const echoOptions = [
    "真正稳住你的，不是用力，而是分寸。",
    "当你不急着证明，答案反而会自己浮现。",
    "把注意力放回真正重要的事，路就会慢慢清楚。",
    "允许自己慢下来，才能看见真正重要的信号。",
    "你的感受本身就是答案，不需要再向外求证。",
    "每一次觉察，都是给自己多一份选择的自由。",
    "今天的你，比昨天多看见了一点自己的模样。",
    "不必急着完成，允许过程本身也是答案。",
  ];
  // Truly random each call
  const echoIndex = Math.floor(Math.random() * echoOptions.length);

  const allPatterns = ["觉察", "边界", "节奏", "表达", "专注", "松弛", "连接", "接纳"];
  const shuffled = [...allPatterns].sort(() => Math.random() - 0.5);
  const behaviorPatterns = shuffled.slice(0, 2 + (Math.random() > 0.5 ? 1 : 0));

  const journalSnippet = journalText.trim().slice(0, 20);
  const journalLen = journalText.trim().length;

  // Score generation: analyze journal content for each dimension independently
  // Positive: 1~5, Negative: -1~-8
  // Based on keyword analysis of the journal text

  // --- Stability: emotional management & stability ---
  const stabilityPositive = /平静|冷静|稳定|放松|安心|满足|感恩|喜悦|开心|期待/.test(journalText);
  const stabilityNegative = /焦虑|生气|崩溃|难过|沮丧|痛苦|烦|讨厌|糟糕|失控/.test(journalText);
  const stabilityScore = stabilityNegative
    ? -(1 + Math.floor(Math.random() * 4))  // -1 ~ -4 (moderate negative)
    : stabilityPositive
      ? (journalLen > 50 ? 4 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2)) // 2~5 or 4~5
  : (journalLen > 20 ? 2 : 1); // neutral: 1~2

  // --- Exploration: trying new things, openness ---
  const explorationPositive = /尝试|探索|新|学习|体验|接触|陌生|第一次|出发/.test(journalText);
  const explorationNegative = /重复|不变|习惯|保守|不敢|害怕|拒绝/.test(journalText);
  const explorationScore = explorationNegative
    ? -(1 + Math.floor(Math.random() * 5)) // -1 ~ -5
    : explorationPositive
      ? (journalLen > 80 ? 4 + Math.floor(Math.random() * 2) : 3) // 3~5 or 4~5
  : 1 + Math.floor(Math.random() * 2); // neutral: 1~2

  // --- Introspection: depth of reflection ---
  const introspectionPositive = /觉得|想到|发现|感觉|认为|反思|觉察|意识|明白|理解|原来/.test(journalText);
  const introspectionScore = !introspectionPositive
    ? (journalLen < 30 ? -(2 + Math.floor(Math.random() * 4)) : -1) // short/no reflection: -1 ~ -5
    : journalLen > 100
      ? 4 + Math.floor(Math.random() * 2)  // deep reflection: 4~5
      : 2 + Math.floor(Math.random() * 2); // some reflection: 2~3

  // --- Action: taking action vs procrastination ---
  const actionPositive = /做了|完成|决定|开始|行动|执行|推进|搞定|解决/.test(journalText);
  const actionNegative = /拖延|没做|明天|下次|算了|放弃|懒|不想/.test(journalText);
  const actionScore = actionNegative
    ? -(2 + Math.floor(Math.random() * 5)) // -2 ~ -6
    : actionPositive
      ? (journalLen > 60 ? 4 + Math.floor(Math.random() * 2) : 3) // 3~5 or 4~5
  : 1; // no action mentioned: 1

  const stabilityDelta = Math.max(-8, Math.min(5, stabilityScore));
  const explorationDelta = Math.max(-8, Math.min(5, explorationScore));
  const introspectionDelta = Math.max(-8, Math.min(5, introspectionScore));
  const actionDelta = Math.max(-8, Math.min(5, actionScore));

  // Vary summary text randomly
  const summaryTemplates = [
    (snippet: string) => snippet
      ? `你写下的"${snippet}"和"${morningTheme}"形成了对应，能看见你今天是怎么把感受推进行动里的。`
      : `今天的"${morningTheme}"和你的日记内容形成了有趣的对应。`,
    (snippet: string) => snippet
      ? `"${snippet}"里藏着你对"${morningTheme}"的真实回应，值得再读一遍。`
      : `从日记里能读出你对"${morningTheme}"这个课题的当下状态。`,
    (snippet: string) => snippet
      ? `读"${snippet}"这段时，发现它和今天的课题"${morningTheme}"悄悄呼应着。`
      : `"${morningTheme}"不是一个遥远的概念，它在你今天的日记里已经有了影子。`,
  ];
  const summaryFn = summaryTemplates[Math.floor(Math.random() * summaryTemplates.length)];

  const mappingTemplates = [
    (snippet: string) => snippet
      ? `这段记录说明，你不是停留在理解课题，而是在具体情境里练习它，尤其体现在"${snippet}"这一处。`
      : `从今天的记录里，能看见你在"${morningTheme}"这个课题上的真实练习。`,
    (snippet: string) => snippet
      ? `"${snippet}"这一笔，刚好映照出"${morningTheme}"在你身上的具体样子。`
      : `今天的你，正在用真实的生活回应"${morningTheme}"这个课题。`,
    (snippet: string) => snippet
      ? `当你写下"${snippet}"的时候，"${morningTheme}"已经在你身上发生了。`
      : `不必刻意练习，"${morningTheme}"已经在你的日记里自然流露出来了。`,
  ];
  const mappingFn = mappingTemplates[Math.floor(Math.random() * mappingTemplates.length)];

  return {
    eveningSummary: summaryFn(journalSnippet),
    behaviorPatterns,
    patternMapping: mappingFn(journalSnippet),
    eveningEcho: echoOptions[echoIndex],
    stabilityDelta: Math.max(-8, Math.min(5, stabilityDelta)),
    explorationDelta: Math.max(-8, Math.min(5, explorationDelta)),
    introspectionDelta: Math.max(-8, Math.min(5, introspectionDelta)),
    actionDelta: Math.max(-8, Math.min(5, actionDelta)),
  };
}

export function generateDemoWeeklyReport(entries: any[], isZh: boolean) {
  const themes = entries.map((e: any) => e.morningTheme).filter(Boolean);
  const coreTheme = themes[0] || (isZh ? "探索自我" : "Self-Exploration");
  
  const cardFreq = new Map<string, number>();
  entries.forEach((entry: any) => {
    const cards = entry.cards?.length ? entry.cards : [{ cardName: entry.cardName }];
    cards.forEach((c: any) => {
      cardFreq.set(c.cardName, (cardFreq.get(c.cardName) ?? 0) + 1);
    });
  });
  
  const cardFrequency = Array.from(cardFreq.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  const themeDescription = isZh
    ? `本周你在"${coreTheme}"这个课题上持续探索，通过${entries.length}篇日记记录了真实的自我对话。牌阵中${cardFrequency[0]?.name}反复出现，暗示这个主题正在深度整合中。`
    : `This week you continuously explored the theme "${coreTheme}", recording authentic self-dialogue through ${entries.length} journal entries. ${cardFrequency[0]?.name} appeared repeatedly in your spreads, suggesting this theme is being deeply integrated.`;
  
  const cosmicQuote = isZh
    ? "这一周的每一步觉察，都在为下一周的蜕变积蓄力量。你正在成为自己的光。✦"
    : "Every step of awareness this week gathers strength for next week's transformation. You are becoming your own light. ✦";
  
  return {
    coreTheme,
    themeDescription,
    cardFrequency,
    cosmicQuote,
  };
}

export function generateDemoMonthlyReport(entries: any[], isZh: boolean, year?: number, month?: number) {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth();
  
  const monthLabel = isZh
    ? `${targetYear}年${targetMonth + 1}月`
    : now.toLocaleString("en-US", { year: "numeric", month: "long" });
  const romanNumeral = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][targetMonth];
  
  const cardSet = new Set<string>();
  const cardFreq = new Map<string, number>();
  const patternSet = new Set<string>();
  
  entries.forEach((entry: any) => {
    const cards = entry.cards?.length ? entry.cards : [{ cardName: entry.cardName }];
    cards.forEach((c: any) => cardSet.add(c.cardName));
    cardFreq.set(entry.cardName, (cardFreq.get(entry.cardName) ?? 0) + 1);
    try {
      const patterns: string[] = JSON.parse(entry.behaviorPatterns ?? "[]");
      patterns.forEach((p: string) => patternSet.add(p));
    } catch { /* ignore */ }
  });
  
  const totalDays = entries.length;
  const uniqueCards = cardSet.size;
  const themeDimensions = Math.max(patternSet.size, 1);
  
  const topCards = Array.from(cardFreq.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  const themeDistribution = isZh
    ? [
        { label: "自我探索", percent: 35 },
        { label: "情绪整合", percent: 25 },
        { label: "行动与选择", percent: 25 },
        { label: "关系镜像", percent: 15 },
      ]
    : [
        { label: "Self-Discovery", percent: 35 },
        { label: "Emotional Integration", percent: 25 },
        { label: "Action & Choice", percent: 25 },
        { label: "Relationship Mirroring", percent: 15 },
      ];
  
  const cosmicQuote = isZh
    ? `在${monthLabel}的旅程中，你勇敢地面对了内心的混沌，也温柔地接纳了自己的不完美。七月，带着这份勇气继续前行。✦`
    : `In the journey of ${monthLabel}, you bravely faced inner chaos and gently embraced your imperfections. Next month, continue forward with this courage. ✦`;
  
  return {
    yearMonthLabel: monthLabel,
    romanNumeral,
    totalDays,
    uniqueCards,
    themeDimensions,
    themeDistribution,
    topCards,
    cosmicQuote,
  };
}
