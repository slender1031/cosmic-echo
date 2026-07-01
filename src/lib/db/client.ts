/**
 * Database client - lazy initialization for Cloudflare Edge Runtime compatibility.
 * 
 * In DEMO_MODE (Cloudflare Pages): DB is never accessed.
 * In production (Node.js): connects to PostgreSQL via DATABASE_URL.
 * 
 * IMPORTANT: This file must NOT import postgres/drizzle at the top level,
 * because those packages use Node.js built-ins (net, tls) unavailable in Edge.
 */

let _dbInstance: any = null;

export async function getDb() {
  if (_dbInstance) return _dbInstance;
  
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  
  // Dynamic require - only runs in Node.js runtime
  // In Edge mode this code path is never reached because DEMO_MODE=true
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/postgres-js");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pg = require("postgres");
    const client = pg(url);
    _dbInstance = drizzle(client);
    return _dbInstance;
  } catch {
    return null;
  }
}

/** Synchronous version for backward compat (may return null if not yet init'd) */
export function getDbSync(): any {
  return _dbInstance;
}

// Legacy named export for existing imports like `import { db } from "@/lib/db/client"`
// Uses Proxy to lazy-load on first property access
export const db = new Proxy({} as any, {
  get(_target: any, prop: string) {
    const instance = getDbSync();
    if (!instance) {
      throw new Error(
        "Database not available. Set DATABASE_URL env var, " +
        "or ensure NEXT_PUBLIC_DEMO_MODE=true for demo mode."
      );
    }
    const val = instance[prop as keyof typeof instance];
    if (typeof val === "function") {
      return val.bind(instance);
    }
    return val;
  },
});
