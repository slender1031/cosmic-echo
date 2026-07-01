/* 案例数据持久化 — localStorage */

export interface CaseCard {
  name: string;
  nameZh: string;
  upright: boolean;
}

export interface CaseRecord {
  id: number;
  date: string;           // "2026/06/30"
  cardSystem: "tarot" | "lenormand";
  spreadId: string;        // 牌阵 ID，如 "single" | "three" | "celtic" | "relation" | "five" | "nine" | "box"
  categories: string[];    // ["career", "love", ...]
  question: string;
  cards: CaseCard[];
  notes: string;
  review: string;
  outcome: "pending" | "matched" | "unmatched";
  photoPreview: string | null;
  createdAt: number;        // Date.now()
}

/* ── 牌阵定义（供新建/编辑/列表页共享） ── */
export interface SpreadDef {
  id: string;
  name: string;
  nameZh: string;
  n: number;
  icon: string;
  desc: string;
  descZh: string;
  labels: string[];
}

export const SPREADS_TAROT: SpreadDef[] = [
  { id: "single", name: "Single", nameZh: "单张牌", n: 1, icon: "🔮", desc: "Quick guidance", descZh: "快速指引，一牌定乾坤", labels: ["中心"] },
  { id: "three", name: "Three Cards", nameZh: "三张牌", n: 3, icon: "🔮🔮🔮", desc: "Past · Present · Future", descZh: "过去 · 现在 · 未来", labels: ["过去", "现在", "未来"] },
  { id: "celtic", name: "Celtic Cross", nameZh: "凯尔特十字", n: 10, icon: "✚", desc: "In-depth full reading", descZh: "全方位深入解读，含交叉牌", labels: ["1.当下", "2.挑战", "3.过去", "4.未来", "5.上方力量", "6.下方力量", "7.自身", "8.外界", "9.希望/恐惧", "10.结果"] },
  { id: "relation", name: "Relationship", nameZh: "关系牌阵", n: 5, icon: "💞", desc: "Two-party dynamic", descZh: "两段关系的解读与互动", labels: ["自己", "对方", "关系现状", "助力", "阻碍"] },
];

export const SPREADS_LENORMAND: SpreadDef[] = [
  { id: "single", name: "Single", nameZh: "单张法", n: 1, icon: "🔮", desc: "Quick guidance", descZh: "快速指引", labels: ["中心"] },
  { id: "three", name: "Three Cards", nameZh: "三张法", n: 3, icon: "🔮🔮🔮", desc: "Past · Present · Future", descZh: "过去 · 现在 · 未来", labels: ["过去", "现在", "未来"] },
  { id: "five", name: "Five Cards", nameZh: "五张法", n: 5, icon: "🖐", desc: "Full question analysis", descZh: "全面解读问题核心", labels: ["问题核心", "挑战", "过去影响", "未来可能", "建议"] },
  { id: "nine", name: "Nine Grid", nameZh: "九张格", n: 9, icon: "🔲", desc: "3×3 detailed analysis", descZh: "3×3 格阵，细致分析", labels: ["左上", "中上", "右上", "左中", "中心", "右中", "左下", "中下", "右下"] },
  { id: "box", name: "Box Spread", nameZh: "盒子牌阵", n: 5, icon: "📦", desc: "Center + four directions", descZh: "中心问题 + 四方位", labels: ["中心问题", "上方", "右方", "下方", "左方"] },
];

/** 根据 cardSystem + spreadId 返回牌阵展示名称（中或英文） */
export function getSpreadLabel(cardSystem: string, spreadId: string, isZh: boolean, cardCount?: number): string {
  const list = cardSystem === "tarot" ? SPREADS_TAROT : SPREADS_LENORMAND;
  const found = list.find((s) => s.id === spreadId);
  if (found) {
    const systemLabel = cardSystem === "tarot" ? (isZh ? "塔罗" : "Tarot") : (isZh ? "雷诺曼" : "Lenormand");
    const name = isZh ? found.nameZh : found.name;
    return `${systemLabel} · ${name}`;
  }
  // 兼容旧数据：根据卡牌数量匹配牌阵
  if (cardCount) {
    const byN = list.find((s) => s.n === cardCount);
    if (byN) {
      const systemLabel = cardSystem === "tarot" ? (isZh ? "塔罗" : "Tarot") : (isZh ? "雷诺曼" : "Lenormand");
      const name = isZh ? byN.nameZh : byN.name;
      return `${systemLabel} · ${name}`;
    }
  }
  const systemLabel = cardSystem === "tarot" ? (isZh ? "塔罗" : "Tarot") : (isZh ? "雷诺曼" : "Lenormand");
  return `${systemLabel} · ${isZh ? "牌阵" : "Spread"}`;
}

const STORAGE_KEY = "cosmic-echo-cases";

/* 读取所有案例（空状态时返回 []） */
export function loadCases(): CaseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CaseRecord[];
  } catch {
    return [];
  }
}

/* 保存全部案例 */
function saveCases(cases: CaseRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

/* 生成新 ID */
function nextId(cases: CaseRecord[]): number {
  if (cases.length === 0) return 1;
  return Math.max(...cases.map((c) => c.id)) + 1;
}

/* 添加一条新案例 */
export function addCase(
  partial: Omit<CaseRecord, "id" | "createdAt">
): CaseRecord {
  const cases = loadCases();
  const record: CaseRecord = {
    ...partial,
    id: nextId(cases),
    createdAt: Date.now(),
  };
  cases.push(record);
  saveCases(cases);
  return record;
}

/* 通知其他组件数据已更新 */
export function notifyCasesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("cosmic-echo-cases-updated"));
}

/* 删除一条案例 */
export function deleteCase(id: number) {
  const cases = loadCases().filter((c) => c.id !== id);
  saveCases(cases);
  notifyCasesUpdated();
}

/* 按 ID 读取一条案例 */
export function getCaseById(id: number): CaseRecord | undefined {
  return loadCases().find((c) => c.id === id);
}

/* 更新一条案例 */
export function updateCase(id: number, partial: Partial<Omit<CaseRecord, "id" | "createdAt">>) {
  const cases = loadCases();
  const idx = cases.findIndex((c) => c.id === id);
  if (idx === -1) return;
  cases[idx] = { ...cases[idx], ...partial };
  saveCases(cases);
  notifyCasesUpdated();
}
