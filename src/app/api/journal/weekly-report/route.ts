import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { DEMO_MODE, generateDemoWeeklyReport } from "@/lib/demo";

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
    const { entries, locale = "zh-CN" } = body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "No entries provided" }, { status: 400 });
    }

    // Try AI first (if not in demo mode and API key is set), fall back to demo generator
    let result: any = null;
    if (!DEMO_MODE) {
      try {
        result = await generateWeeklyReportWithAI(entries, locale);
      } catch (aiErr) {
        console.warn("[Weekly Report] AI call failed, using fallback:", aiErr);
      }
    }

    // Fallback: use demo generator if AI failed or in demo mode
    if (!result) {
      result = generateDemoWeeklyReport(entries, locale === "zh-CN");
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Weekly report error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

async function generateWeeklyReportWithAI(entries: JournalEntry[], locale: string) {
  const isZh = locale === "zh-CN";

  const weekStart = new Date(entries[0].date);
  const weekEnd = new Date(entries[entries.length - 1].date);
  const dateRange = isZh
    ? `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
    : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const journalSummary = entries.map((entry, idx) => {
    const date = new Date(entry.date);
    const dateStr = isZh
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${idx + 1}. ${dateStr} - ${entry.morningTheme || ''} - ${entry.eveningEcho || ''} - ${entry.journalText ? entry.journalText.slice(0, 50) : ''}`;
  }).join('\n');

  const cardFreq = new Map<string, number>();
  entries.forEach(entry => {
    cardFreq.set(entry.cardName, (cardFreq.get(entry.cardName) ?? 0) + 1);
  });
  const topCards = Array.from(cardFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name)
    .join('、');

  const systemPrompt = isZh
    ? `你是一位温柔而有洞察力的日记回顾助手。你会分析用户一周的日记内容，提炼出核心主题和成长模式，生成一份温暖的周报。语气要像一位理解用户的好朋友，不说教，不评判，只映照和陪伴。`
    : `You are a gentle and insightful journal reflection assistant. You analyze the user's journal entries for the week, extract core themes and growth patterns, and generate a warm weekly report. Your tone should be like an understanding friend—not preachy, not judgmental, just reflective and陪伴.`;

  const userPrompt = isZh ? `
这是用户${dateRange}这一周的日记记录：

${journalSummary}

高频牌：
${topCards}

请分析这一周的日记内容，生成一份周报，包含：
1. coreTheme: 这一周的核心主题（10字以内）
2. themeDescription: 对这一周主题的详细描述（50-80字），要结合具体日记内容，不要空洞
3. cardFrequency: 这一周出现频率最高的牌（从高频牌中选取）
4. cosmicQuote: 一句温暖的周报金句（20-30字），要打动人心，有共鸣

请以JSON格式返回，格式如下：
{
  "coreTheme": "主题",
  "themeDescription": "描述",
  "cardFrequency": [{"name": "牌名", "count": 次数}],
  "cosmicQuote": "金句"
}
` : `
Here are the user's journal entries for the week of ${dateRange}:

${journalSummary}

Top cards:
${topCards}

Please analyze this week's journal content and generate a weekly report with:
1. coreTheme: core theme of this week (under 10 words)
2. themeDescription: detailed description of the week's theme (50-80 words), grounded in specific journal content
3. cardFrequency: most frequent cards this week
4. cosmicQuote: a warm insightful quote for the week (20-30 words)

Return in JSON format:
{
  "coreTheme": "theme",
  "themeDescription": "description",
  "cardFrequency": [{"name": "card name", "count": count}],
  "cosmicQuote": "quote"
}
`;

  const raw = await callAI({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 800,
  });

  console.log("[Weekly Report] AI raw response:", raw);

  const cleaned = raw.replace(/```json|```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Weekly Report] Failed to parse JSON from:", raw);
    return null;
  }

  const result = JSON.parse(jsonMatch[0]);

  if (!result.cardFrequency || !Array.isArray(result.cardFrequency)) {
    result.cardFrequency = Array.from(cardFreq.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  return result;
}
