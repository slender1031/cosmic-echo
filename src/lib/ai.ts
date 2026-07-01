/**
 * Call an OpenAI-compatible chat completions API.
 * Supports OpenAI, DeepSeek, OpenRouter, etc.
 *
 * Env vars:
 *   AI_API_KEY  - required (defaults to OPENAI_API_KEY)
 *   AI_BASE_URL - optional (defaults to "https://api.openai.com/v1")
 *   AI_MODEL    - optional (defaults to "gpt-4o")
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionChoice {
  message?: {
    content?: string | null;
  };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
}

export async function callAI(params: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
  const model = params.model ?? process.env.AI_MODEL ?? "gpt-4o";

  if (!apiKey) {
    throw new Error(
      "AI_API_KEY (or OPENAI_API_KEY) environment variable is not set. " +
      "Set it in wrangler.toml or via `npx wrangler pages secret put AI_API_KEY`."
    );
  }

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: params.messages,
      temperature: params.temperature ?? 0.8,
      max_tokens: params.max_tokens ?? 1000,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`AI API error ${res.status}: ${text}`);
  }

  const json = await res.json() as ChatCompletionResponse;
  const content = json.choices?.[0]?.message?.content ?? "";
  return content;
}
