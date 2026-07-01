import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getCardById, type TarotCard } from "@/lib/tarot-data";
import { getLenormandCardById, type LenormandCard } from "@/lib/lenormand-data";
import { DEMO_MODE, generateDemoEvening } from "@/lib/demo";
import { callAI } from "@/lib/ai";

type AnyCard = TarotCard | LenormandCard;

function clampDelta(val: unknown, min: number, max: number): number {
  const n = typeof val === "number" ? val : 0;
  return Math.max(min, Math.min(max, n));
}

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

function validateEveningResult(obj: Record<string, unknown>) {
  const result = {
    eveningSummary: typeof obj.eveningSummary === "string" ? obj.eveningSummary : "",
    behaviorPatterns: Array.isArray(obj.behaviorPatterns) ? obj.behaviorPatterns.slice(0, 4) : [],
    patternMapping: typeof obj.patternMapping === "string" ? obj.patternMapping : "",
    eveningEcho: typeof obj.eveningEcho === "string" ? obj.eveningEcho : "",
    stabilityDelta: clampDelta(obj.stabilityDelta, -8, 5),
    explorationDelta: clampDelta(obj.explorationDelta, -8, 5),
    introspectionDelta: clampDelta(obj.introspectionDelta, -8, 5),
    actionDelta: clampDelta(obj.actionDelta, -8, 5),
  };
  if (!result.eveningEcho) return null;
  return result;
}

async function callEveningAI(
  morningTheme: string,
  morningQuestion: string | null,
  cardOrientation: string,
  card: AnyCard | null,
  journalText: string,
) {
  const orientation = card && cardOrientation === "reversed"
    ? ("reversedTheme" in card ? (card as any).reversedTheme : "")
    : (card && "uprightTheme" in card ? (card as any).uprightTheme : "");

  const systemPrompt = `You are a warm, empathetic journaling companion. Your role is to reflect back what you notice in the user's writing — not to give advice, diagnose, or tell them what to do.

Tone: gentle, validating, like a caring friend who really listens. Never say "you should" or "you need to". Stay in the user's language (if they write in Chinese, reply in Chinese; if English, reply in English).

For the "eveningEcho" field, write a short, poetic reflection sentence (15-25 characters for Chinese, 10-20 words for English) that captures the essence of their day. It should feel like something they'd want to save and reread.`;

  const userPrompt = `Here is the user's context:

Morning theme: ${morningTheme}
${morningQuestion ? `Morning question: ${morningQuestion}` : ""}
${orientation ? `Card guidance: ${orientation}` : ""}

User's journal entry:
${journalText}

---

Please analyze the journal entry in relation to the morning theme. Return a JSON object with these fields:

- eveningSummary: string (2-3 sentence summary of what you notice in their journal, grounded in their actual words)
- behaviorPatterns: string[] (2-4 keyword patterns that show up in their writing, in the user's language)
- patternMapping: string (1-2 sentences connecting the journal content back to the morning theme)
- eveningEcho: string (a concise, warm reflection quote — 15-25 chars for Chinese, 10-20 words for English)
- stabilityDelta: number (range -8 to +5, how emotionally stable/consistent they seem today)
- explorationDelta: number (range -8 to +5, how much they tried new things or showed openness)
- introspectionDelta: number (range -8 to +5, how deeply they reflected on their experiences)
- actionDelta: number (range -8 to +5, how much they took action vs procrastinated)

Scoring guidance:
- Positive scores (1 to 5): growth/health in that dimension, use higher scores for clearly exceptional positive behavior
- Negative scores (-1 to -8): area needing attention, but keep it gentle, not punitive; use more negative scores only for clearly problematic behavior
- Score 0: neutral day with no notable positive or negative behavior
- Each dimension is independent, score them separately based on the user's actual behavior

Return ONLY the JSON object, no markdown formatting, no extra text.`;

  const raw = await callAI({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 1000,
  });

  console.log("[Evening Generate] AI raw response:", raw);

  const parsed = safeJsonParse(raw);
  if (!parsed) {
    console.error("[Evening Generate] Failed to parse JSON from:", raw);
    return null;
  }

  return validateEveningResult(parsed);
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json();
    const { cardId, cardOrientation, morningTheme, morningQuestion, journalText, cardSystem } = body;

    let card: AnyCard | null = null;
    if (cardId) {
      if (cardSystem === "lenormand") {
        const lenormandCard = getLenormandCardById(cardId);
        if (lenormandCard) card = lenormandCard;
      } else {
        const tarotCard = getCardById(cardId);
        if (tarotCard) card = tarotCard;
      }
    }

    // Try AI first (if not in demo mode and API key is set), fall back to demo generator
    let result: Record<string, unknown> | null = null;
    if (!DEMO_MODE) {
      try {
        result = await callEveningAI(morningTheme, morningQuestion, cardOrientation, card, journalText);
      } catch (aiErr) {
        console.warn("[Evening Generate] AI call failed, using fallback:", aiErr);
      }
    }

    // Fallback: use demo generator if AI failed or in demo mode
    if (!result) {
      result = generateDemoEvening(morningTheme, journalText);
    }

    console.log("[Evening Generate] Result:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Evening generate error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
