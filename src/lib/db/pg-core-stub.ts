// Edge Runtime stub for drizzle-orm/pg-core
// This file replaces the real pg-core when building for Cloudflare Pages (Edge Runtime).
// All functions return minimal mock values that allow the schema files to compile.
// At runtime in demo mode, these schemas are never actually used.

function col(name: string, opts?: unknown) {
  return { name, opts, _col: true };
}

function pgTable(name: string, def: unknown, indexes?: unknown) {
  return { _table: name, _def: def, _indexes: indexes };
}

export { pgTable };
export function text(name: string, opts?: unknown) { return col(name, opts); }
export function varchar(name: string, opts?: unknown) { return col(name, opts); }
export function timestamp(name: string, opts?: unknown) { return col(name, opts); }
export function integer(name: string, opts?: unknown) { return col(name, opts); }
export function boolean(name: string, opts?: unknown) { return col(name, opts); }
export function json(name: string, opts?: unknown) { return col(name, opts); }
export function primaryKey(...cols: unknown[]) { return { _pk: cols }; }
export function index(name: string) {
  return { on: (...cols: unknown[]) => ({ _idx: name, _cols: cols }) };
}
export function uniqueIndex(name: string) {
  return { on: (...cols: unknown[]) => ({ _uidx: name, _cols: cols }) };
}
export function foreignKey(...cols: unknown[]) {
  return { references: (...refs: unknown[]) => ({ _fk: cols, _refs: refs }) };
}
export function check(name: string, fn: unknown) {
  return { name, fn, _check: true };
}
export function pgEnum(name: string, values: readonly string[]) {
  return { _enum: name, values };
}
