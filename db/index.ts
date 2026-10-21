import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getTableName } from "drizzle-orm";
import * as schema from "./schema";

type AnyRow = Record<string, any>;
type Store = Record<string, AnyRow[]>;

function getMemStore(): Store {
  const g = globalThis as unknown as { __frStore?: Store };
  if (!g.__frStore) {
    g.__frStore = {
      projects: [],
      members: [],
      commitments: [],
      evidence: [],
      reviews: [],
      decisions: [],
    };
  }
  return g.__frStore;
}

function colToProp(table: any, colName: string): string {
  for (const [k, v] of Object.entries(table)) {
    if ((v as any)?.name === colName) return k;
  }
  return colName;
}

function extractPredicates(table: any, cond: any): Array<[string, any]> {
  if (!cond || !Array.isArray(cond.queryChunks)) return [];
  const chunks = cond.queryChunks;
  const out: Array<[string, any]> = [];
  let lastCol: string | null = null;
  for (const c of chunks) {
    if (!c) continue;
    if (Array.isArray(c.queryChunks)) {
      out.push(...extractPredicates(table, c));
    } else if (typeof c.name === "string" && "columnType" in c) {
      lastCol = colToProp(table, c.name);
    } else if ("encoder" in c && lastCol) {
      out.push([lastCol, c.value]);
      lastCol = null;
    }
  }
  return out;
}

function matches(table: any, row: AnyRow, cond?: any): boolean {
  const preds = extractPredicates(table, cond);
  return preds.every(([k, v]) => row[k] === v);
}

function memDb() {
  const store = getMemStore();
  const rowsOf = (table: any): AnyRow[] => {
    const name = getTableName(table);
    if (!store[name]) store[name] = [];
    return store[name];
  };
  return {
    select() {
      return {
        from(table: any) {
          const all = () => rowsOf(table).map((r) => ({ ...r }));
          const p = Promise.resolve(all()) as Promise<AnyRow[]> & {
            where: (cond: any) => Promise<AnyRow[]>;
          };
          p.where = (cond: any) =>
            Promise.resolve(rowsOf(table).filter((r) => matches(table, r, cond)).map((r) => ({ ...r })));
          return p;
        },
      };
    },
    insert(table: any) {
      return {
        async values(val: AnyRow | AnyRow[]) {
          const list = Array.isArray(val) ? val : [val];
          const target = rowsOf(table);
          for (const item of list) {
            target.push({
              createdAt: new Date(),
              agreedAt: null,
              submittedAt: null,
              fulfilledAt: null,
              url: null,
              comment: null,
              reason: null,
              isDemo: false,
              phase: "setup",
              ...item,
            });
          }
          return list;
        },
      };
    },
    update(table: any) {
      return {
        set(patch: AnyRow) {
          return {
            async where(cond: any) {
              for (const r of rowsOf(table)) {
                if (matches(table, r, cond)) Object.assign(r, patch);
              }
            },
          };
        },
      };
    },
  };
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
export function db(): ReturnType<typeof drizzle<typeof schema>> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return memDb() as unknown as ReturnType<typeof drizzle<typeof schema>>;
  }
  if (!_db) {
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}
export * as s from "./schema";
