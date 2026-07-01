import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getEntryByDate,
  getUserEntries,
  getUserStreak,
} from "@/lib/db/queries/journal";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "cosmic-echo-mcp",
    version: "1.0.0",
  });

  // Tool 1: get today's journal entry
  server.tool(
    "get_today_entry",
    "Get the current user's journal entry for today, including tarot card, morning theme, and evening echo.",
    {},
    async () => {
      const today = new Date().toISOString().split("T")[0];
      const entry = await getEntryByDate(userId, today);
      if (!entry) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ message: "No entry for today yet." }) }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(entry) }] };
    }
  );

  // Tool 2: get entry by date
  server.tool(
    "get_entry_by_date",
    "Get a specific journal entry by date (YYYY-MM-DD format).",
    { date: z.string().describe("Date in YYYY-MM-DD format") },
    async ({ date }) => {
      const entry = await getEntryByDate(userId, date);
      if (!entry) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ message: `No entry found for ${date}` }) }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(entry) }] };
    }
  );

  // Tool 3: get journal history
  server.tool(
    "get_journal_history",
    "Get the user's recent journal entries. Useful for identifying recurring behavior patterns.",
    { limit: z.number().min(1).max(30).default(10).describe("Number of recent entries") },
    async ({ limit }) => {
      const entries = await getUserEntries(userId, limit);
      const streak = await getUserStreak(userId);
      return { content: [{ type: "text" as const, text: JSON.stringify({ streak, entries }) }] };
    }
  );

  // Tool 4: get behavior pattern summary
  server.tool(
    "get_behavior_pattern_summary",
    "Analyze the user's recent journal entries and extract recurring behavior patterns.",
    {},
    async () => {
      const entries = await getUserEntries(userId, 30);
      const allPatterns: string[] = [];
      for (const entry of entries) {
        try {
          const p = JSON.parse(entry.behaviorPatterns ?? "[]");
          allPatterns.push(...p);
        } catch { /* skip */ }
      }
      const freq: Record<string, number> = {};
      for (const p of allPatterns) { freq[p] = (freq[p] ?? 0) + 1; }
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([pattern, count]) => ({ pattern, count }));
      return { content: [{ type: "text" as const, text: JSON.stringify({ totalAnalyzed: entries.length, topPatterns: sorted.slice(0, 10) }) }] };
    }
  );

  // Tool 5: get user stats
  server.tool(
    "get_user_stats",
    "Get the user's journaling streak and overall statistics.",
    {},
    async () => {
      const [entries, streak] = await Promise.all([getUserEntries(userId, 60), getUserStreak(userId)]);
      const completed = entries.filter((e) => e.isComplete).length;
      return { content: [{ type: "text" as const, text: JSON.stringify({ currentStreak: streak, totalEntries: entries.length, completedEntries: completed, completionRate: entries.length > 0 ? Math.round((completed / entries.length) * 100) : 0 }) }] };
    }
  );

  return server;
}
