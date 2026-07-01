import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { journalEntries, type JournalEntry } from "@/lib/db/schema/journal";

export async function getOrCreateTodayEntry(
  userId: string,
  date: string
): Promise<JournalEntry | null> {
  const [existing] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)))
    .limit(1);
  return existing ?? null;
}

export async function getEntryByDate(
  userId: string,
  date: string
): Promise<JournalEntry | null> {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)))
    .limit(1);
  return entry ?? null;
}

export async function createEntry(
  data: typeof journalEntries.$inferInsert
): Promise<JournalEntry> {
  const [entry] = await db.insert(journalEntries).values(data).returning();
  return entry;
}

export async function updateEntry(
  id: string,
  userId: string,
  data: Partial<typeof journalEntries.$inferInsert>
): Promise<JournalEntry | null> {
  const [updated] = await db
    .update(journalEntries)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function getUserEntries(
  userId: string,
  limit = 30,
  offset = 0
): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.date))
    .limit(limit)
    .offset(offset);
}

export async function getEntriesInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        gte(journalEntries.date, startDate),
        lte(journalEntries.date, endDate)
      )
    )
    .orderBy(desc(journalEntries.date));
}

export async function getUserStreak(userId: string): Promise<number> {
  const entries = await db
    .select({ date: journalEntries.date, isComplete: journalEntries.isComplete })
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.isComplete, true)))
    .orderBy(desc(journalEntries.date))
    .limit(60);

  if (entries.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < entries.length; i++) {
    const entryDate = new Date(entries[i].date);
    entryDate.setHours(0, 0, 0, 0);
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (entryDate.getTime() !== expected.getTime()) break;
    streak++;
  }
  return streak;
}

export async function getEntryById(
  id: string,
  userId: string
): Promise<JournalEntry | null> {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .limit(1);
  return entry ?? null;
}

export async function deleteEntry(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();
  return result.length > 0;
}
