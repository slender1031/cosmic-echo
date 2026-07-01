// Edge Runtime stub for drizzle-orm/pg-core
// Replaces Node.js-only pg-core with mock objects that support chaining,
// so schema files compile and "run" (in demo mode they're never actually queried).

/** Create a chainable column builder mock */
function col(name: string) {
  const c: any = { _col: true, name };
  // All chainable modifiers just return the same object
  c.primaryKey = () => c;
  c.notNull = () => c;
  c.default = (val: unknown) => c;
  c.defaultNow = () => c;
  c.unique = () => c;
  c.references = (...args: unknown[]) => c;
  c.array = () => c;
  c.$type = () => c;
  c.generated = (...args: unknown[]) => c;
  return c;
}

// Column definition functions
export function text(name: string, opts?: unknown) { return col(name); }
export function varchar(name: string, opts?: unknown) { return col(name); }
export function timestamp(name: string, opts?: unknown) { return col(name); }
export function integer(name: string, opts?: unknown) { return col(name); }
export function boolean(name: string, opts?: unknown) { return col(name); }
export function json(name: string, opts?: unknown) { return col(name); }
export function jsonb(name: string, opts?: unknown) { return col(name); }
export function date(name: string, opts?: unknown) { return col(name); }
export function real(name: string, opts?: unknown) { return col(name); }
export function pgEnum(name: string, values: readonly string[]) {
  // Returns a function that creates a column def
  const fn = (colName: string, opts?: unknown) => col(colName);
  return fn;
}

// pgTable: returns a mock table object
export function pgTable(name: string, columns: unknown, extra?: unknown) {
  const t: any = { _table: name };
  // Make all column names accessible as properties (for index/foreignKey builders)
  if (columns && typeof columns === "object") {
    for (const [key, val] of Object.entries(columns as any)) {
      t[key] = val;
    }
  }
  return t;
}

// Index helpers
export function index(name: string) {
  return { on: (...cols: unknown[]) => ({ _idx: name }) };
}
export function uniqueIndex(name: string) {
  return { on: (...cols: unknown[]) => ({ _uidx: name }) };
}

// primaryKey as a standalone function (for composite PKs)
export function primaryKey(...cols: unknown[]) {
  return { _pk: cols };
}

// foreignKey
export function foreignKey(...cols: unknown[]) {
  return { references: (...refs: unknown[]) => ({ _fk: cols, _refs: refs }) };
}

// check constraint
export function check(name: string, fn: unknown) {
  return { name, fn };
}
