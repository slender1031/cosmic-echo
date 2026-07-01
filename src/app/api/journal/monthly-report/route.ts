import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, generateDemoMonthlyReport } from "@/lib/demo";

export const runtime = 'edge';
import { callAI } from "@/lib/ai";

interface JournalEntry {
  date: string;
  morningTheme: string | null;
  eveningEcho: string | null;
  journalText: string | null;
  behaviorPatterns: string | null;
  cardName: string;
  cardOrientation: string;
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json();
    const { entries, locale = "zh-CN", year, month } = body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "No entries provided" }, { status: 400 });
    }

    // Try AI first (if not in demo mode and API key is set), fall back to demo generator
    let result: any = null;
    if (!DEMO_MODE) {
      try {
        result = await generateMonthlyReportWithAI(entries, locale, year, month);
      } catch (aiErr) {
        console.warn("[Monthly Report] AI call failed, using fallback:", aiErr);
      }
    }

    // Fallback: use demo generator if AI failed or in demo mode
    if (!result) {
      result = generateDemoMonthlyReport(entries, locale === "zh-CN", year, month);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Monthly report error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

async function generateMonthlyReportWithAI(entries: JournalEntry[], locale: string, year?: number, month?: number) {
  const isZh = locale === "zh-CN";

  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth();

  const monthLabel = isZh
    ? `${targetYear}年${targetMonth + 1}月`
    : now.toLocaleString("en-US", { year: "numeric", month: "long" });
  const romanNumeral = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][targetMonth];

  const totalDays = entries.length;

  const cardSet = new Set<string>();
  const cardFreq = new Map<string, number>();
  const patternSet = new Set<string>();

  entries.forEach(entry => {
    cardSet.add(entry.cardName);
    cardFreq.set(entry.cardName, (cardFreq.get(entry.cardName) ?? 0) + 1);
    try {
      const patterns: string[] = JSON.parse(entry.behaviorPatterns ?? "[]");
      patterns.forEach(p => patternSet.add(p));
    } catch { /* ignore */ }
  });

  const uniqueCards = cardSet.size;
  const themeDimensions = Math.max(patternSet.size, 1);

  const topCards = Array.from(cardFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const journalSummary = entries.slice(0, 10).map((entry, idx) => {
    const date = new Date(entry.date);
    const dateStr = isZh
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${idx + 1}. ${dateStr} - ${entry.morningTheme || ''} - ${entry.eveningEcho || ''}`;
  }).join('\n');

  const systemPrompt = isZh
    ? `你是一位温柔而有洞察力的月度回顾助手。你会分析用户一个月的日记内容，提炼出主题分布、成长轨迹和宇宙月语，生成一份温暖的月报。语气要像一位理解用户的好朋友，不说教，不评判，只映照和陪伴。`
    : `You are a gentle and insightful monthly reflection assistant. You analyze the user's journal entries for the month, extract theme distributions, growth trajectories, and cosmic monthly quotes, generating a warm monthly report. Your tone should be like an understanding friend—not preachy, not judgmental, just reflective and accompanying.`;

  const userPrompt = isZh ? `
这是用户${monthLabel}的日记记录（共${totalDays}天）：

${journalSummary}

${entries.length > 10 ? `...（还有${entries.length - 10}天的记录）` : ''}

统计数据：
- 记录天数：${totalDays}天
- 不同牌：${uniqueCards}张
- 主题维度：${themeDimensions}个
- 高频牌：${topCards.map(c => `${c.name}(${c.count}次)`).join('、')}

请分析这个月的日记内容，生成一份月报，包含：
1. themeDistribution: 本月主题分布（4个维度，每个有label和percent，总和为100）
2. cosmicQuote: 一句温暖的宇宙月语（30-50字），要打动人心，有共鸣，总结这个月的成长

请以JSON格式返回，格式如下：
{
  "themeDistribution": [{"label": "主题1", "percent": 40}, {"label": "主题2", "percent": 30}, {"label": "主题3", "percent": 20}, {"label": "主题4", "percent": 10}],
  "cosmicQuote": "月语"
}
` : `
Here are the user's journal entries for ${monthLabel} (${totalDays} days total):

${journalSummary}

${entries.length > 10 ? `... (${entries.length - 10} more entries)` : ''}

Statistics:
- Total days: ${totalDays}
- Unique cards: ${uniqueCards}
- Theme dimensions: ${themeDimensions}
- Top cards: ${topCards.map(c => `${c.name}(${c.count})`).join(', ')}

Please analyze this month's journal content and generate a monthly report with:
1. themeDistribution: this month's theme distribution (4 dimensions, each with label and percent, sum to 100)
2. cosmicQuote: a warm cosmic monthly quote (30-50 words), touching and resonant, summarizing this month's growth

Return in JSON format:
{
  "themeDistribution": [{"label": "theme1", "percent": 40}, {"label": "theme2", "percent": 30}, {"label": "theme3", "percent": 20}, {"label": "theme4", "percent": 10}],
  "cosmicQuote": "quote"
}
`;

  const raw = await callAI({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 1000,
  });

  console.log("[Monthly Report] AI raw response:", raw);

  const cleaned = raw.replace(/```json|```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Monthly Report] Failed to parse JSON from:", raw);
    return null;
  }

  const aiResult = JSON.parse(jsonMatch[0]);

  return {
    yearMonthLabel: monthLabel,
    romanNumeral,
    totalDays,
    uniqueCards,
    themeDimensions,
    themeDistribution: aiResult.themeDistribution || generateDefaultThemeDistribution(isZh),
    topCards,
    cosmicQuote: aiResult.cosmicQuote || (isZh ? "愿这个月的每一步都成为下个月的基石。✦" : "May every step this month become the foundation for next month. ✦"),
  };
}

function generateDefaultThemeDistribution(isZh: boolean) {
  if (isZh) {
    return [
      { label: "自我探索", percent: 42 },
      { label: "行动与选择", percent: 28 },
      { label: "情绪整合", percent: 20 },
      { label: "关系镜像", percent: 10 },
    ];
  }
  return [
    { label: "Self-Discovery", percent: 42 },
    { label: "Action & Choice", percent: 28 },
    { label: "Emotional Integration", percent: 20 },
    { label: "Relationship Mirroring", percent: 10 },
  ];
}
