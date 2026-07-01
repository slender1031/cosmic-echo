import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getCardById } from "@/lib/tarot-data";

export const runtime = 'edge';
import { getLenormandCardById } from "@/lib/lenormand-data";
import { DEMO_MODE, generateDemoMorning } from "@/lib/demo";
import { callAI } from "@/lib/ai";

function safeJsonParse(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function validateMorningResult(obj: Record<string, unknown>, isZh: boolean) {
  const theme = typeof obj.morningTheme === "string" ? obj.morningTheme : "";
  const question = typeof obj.morningQuestion === "string" ? obj.morningQuestion : "";
  const description = typeof obj.morningQuestionDescription === "string" ? obj.morningQuestionDescription : "";
  if (!theme || !question) return null;
  return { morningTheme: theme, morningQuestion: question, morningQuestionDescription: description };
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.ok) return authResult.response;

  try {
    const { cards, cardId, cardOrientation, astrologyTag, astrologyDescription, moonPhase, locale, cardSystem } =
      await request.json();

    const normalizedCards = Array.isArray(cards) && cards.length > 0
      ? cards
      : [{ cardId, cardOrientation }];

    const isLenormand = cardSystem === "lenormand";
    const resolvedCards = normalizedCards
      .map((item) => {
        const card = isLenormand ? getLenormandCardById(item.cardId) : getCardById(item.cardId);
        if (!card) return null;
        return {
          card,
          orientation: item.cardOrientation === "reversed" ? "reversed" : "upright",
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (resolvedCards.length === 0) {
      return NextResponse.json({ error: "No valid cards found" }, { status: 400 });
    }

    if (DEMO_MODE) {
      return NextResponse.json(
        generateDemoMorning(
          resolvedCards.map(({ card, orientation }) => ({
            cardName: isZhLocale(locale) ? card.nameZh : card.name,
            orientation,
          })),
          moonPhase ?? "",
          astrologyTag ?? "",
        ),
      );
    }

    // Try AI, fall back to demo on failure
    try {
      const isZh = isZhLocale(locale);
      const cardContext = resolvedCards
        .map(({ card, orientation }, index) => {
          const theme = orientation === "reversed" ? card.reversedTheme : card.uprightTheme;
          const name = isZh ? card.nameZh : card.name;
          return `${index + 1}. ${name} (${orientation}) — ${theme}`;
        })
        .join("\n");

      const { systemPrompt, userPrompt } = isZh
        ? buildZhPrompt(cardContext, moonPhase, astrologyTag, astrologyDescription)
        : buildEnPrompt(cardContext, moonPhase, astrologyTag, astrologyDescription);

      const raw = await callAI({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      console.log("[Morning Generate] AI raw response:", raw);

      const parsed = safeJsonParse(raw);
      if (!parsed) {
        console.error("[Morning Generate] Failed to parse JSON from:", raw);
        return NextResponse.json(generateDemoMorning(
          resolvedCards.map(({ card, orientation }) => ({
            cardName: isZh ? card.nameZh : card.name,
            orientation,
          })),
          moonPhase ?? "",
          astrologyTag ?? "",
        ));
      }

      const result = validateMorningResult(parsed, isZh);
      if (!result) {
        console.error("[Morning Generate] Invalid result from AI:", parsed);
        return NextResponse.json(generateDemoMorning(
          resolvedCards.map(({ card, orientation }) => ({
            cardName: isZh ? card.nameZh : card.name,
            orientation,
          })),
          moonPhase ?? "",
          astrologyTag ?? "",
        ));
      }

      return NextResponse.json(result);
    } catch (aiErr) {
      console.warn("[Morning Generate] AI failed, using demo fallback:", aiErr);
      return NextResponse.json(
        generateDemoMorning(
          resolvedCards.map(({ card, orientation }) => ({
            cardName: isZhLocale(locale) ? card.nameZh : card.name,
            orientation,
          })),
          moonPhase ?? "",
          astrologyTag ?? "",
        ),
      );
    }
  } catch (err) {
    console.error("Morning generate error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

function isZhLocale(locale: unknown): boolean {
  return typeof locale === "string" && locale.startsWith("zh");
}

function buildZhPrompt(cardContext: string, moonPhase: string | null, astrologyTag: string | null, astrologyDescription: string | null) {
  const systemPrompt = `你是一个温柔的日记陪伴者，帮助用户从塔罗/雷诺曼牌、月相和星象中获得今天的启发。
语气要求：温暖、有共鸣、不说教。像一个有同理心的朋友在说话，而不是老师在布置作业。
禁止：不说"你应该"、不给出具体建议、不解释牌意，只把牌的能量转化为生活中的课题提问。`;

  const userPrompt = `以下是用户今天的情况：

月相：${moonPhase ?? "未知"}
星象：${astrologyTag ?? ""} — ${astrologyDescription ?? ""}
抽到的牌：
${cardContext}

请综合以上信息，生成今天的晨间引导内容。

严格要求：
1. "morningTheme" — 今日课题金句，15-25 个中文字，点出核心启示，不要提到牌名或星象术语
2. "morningQuestion" — 反思提问，15-25 个中文字，一句话，引导用户向内看
3. "morningQuestionDescription" — 情绪引导，25-40 个中文字，可以用 \\n 换行，温柔地帮助用户进入反思状态，不要重复问题本身

禁止：
- 不要提到任何牌名、牌数、正逆位
- 不要用"XX提醒你""XX告诉你"这种说法
- 不要加引号或"课题：" "问题：" 这样的前缀标签

返回 JSON 格式：
{"morningTheme":"...","morningQuestion":"...","morningQuestionDescription":"..."}

只返回 JSON，不要 markdown 包裹，不要额外文字。`;

  return { systemPrompt, userPrompt };
}

function buildEnPrompt(cardContext: string, moonPhase: string | null, astrologyTag: string | null, astrologyDescription: string | null) {
  const systemPrompt = `You are a warm, gentle journaling companion. Your job is to help the user find a meaningful theme and question for their morning reflection based on their cards, moon phase, and astrology.

Tone: gentle, poetic, inviting — like a caring friend, not a teacher or advisor.
Never say "you should" or give advice. Instead, offer a theme to contemplate and a question to sit with.`;

  const userPrompt = `Here is the user's context for today:

Moon phase: ${moonPhase ?? "unknown"}
Astrology: ${astrologyTag ?? ""} — ${astrologyDescription ?? ""}
Drawn cards:
${cardContext}

---

Please generate today's morning reflection content. Return a JSON object with:

1. "morningTheme" — a short thematic phrase (10-15 words), capturing the core insight. Do NOT mention card names or astrology terms.
2. "morningQuestion" — a gentle reflective question (10-15 words) that invites inner exploration.
3. "morningQuestionDescription" — a warm, inviting paragraph (15-25 words, can use \\n for line break) that helps the user settle into reflection. Do NOT repeat the question.

Forbidden:
- Do not mention card names, positions, or astrology terms in the output
- Do not say "the cards remind you" or "the stars tell you"
- Do not add labels like "Theme:" or "Question:" — just the content

Return ONLY the JSON object, no markdown formatting, no extra text.
{"morningTheme":"...","morningQuestion":"...","morningQuestionDescription":"..."}`;

  return { systemPrompt, userPrompt };
}
