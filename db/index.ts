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

/**
 * Strips `psql '...'`, surrounding quotes, and unsupported query params
 * so any pasted Neon snippet works automatically.
 */
export function cleanDatabaseUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/postgres(?:ql)?:\/\/[^\s'"]+/i);
  if (!match) return null;
  return match[0].replace(/([?&])channel_binding=require(&?)/i, (_, p1, p2) => (p2 ? p1 : ""));
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _schemaReady: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  const url = cleanDatabaseUrl(process.env.DATABASE_URL);
  if (!url) return;
  if (!_schemaReady) {
    _schemaReady = (async () => {
      try {
        const sql = neon(url);
        await sql`CREATE TABLE IF NOT EXISTS "projects" ("id" text PRIMARY KEY NOT NULL, "code" text NOT NULL UNIQUE, "title" text NOT NULL, "phase" text DEFAULT 'setup' NOT NULL, "is_demo" boolean DEFAULT false NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL)`;
        await sql`CREATE TABLE IF NOT EXISTS "members" ("id" text PRIMARY KEY NOT NULL, "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade, "name" text NOT NULL, "role" text DEFAULT 'member' NOT NULL, "token" text NOT NULL UNIQUE, "agreed_at" timestamp, "submitted_at" timestamp)`;
        await sql`CREATE TABLE IF NOT EXISTS "commitments" ("id" text PRIMARY KEY NOT NULL, "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade, "owner_id" text NOT NULL REFERENCES "members"("id") ON DELETE cascade, "title" text NOT NULL, "weight" integer DEFAULT 1 NOT NULL, "fulfilled_at" timestamp)`;
        await sql`CREATE TABLE IF NOT EXISTS "evidence" ("id" text PRIMARY KEY NOT NULL, "commitment_id" text NOT NULL REFERENCES "commitments"("id") ON DELETE cascade, "author_id" text NOT NULL REFERENCES "members"("id") ON DELETE cascade, "note" text NOT NULL, "url" text, "created_at" timestamp DEFAULT now() NOT NULL)`;
        await sql`CREATE TABLE IF NOT EXISTS "reviews" ("id" text PRIMARY KEY NOT NULL, "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade, "reviewer_id" text NOT NULL REFERENCES "members"("id") ON DELETE cascade, "reviewee_id" text NOT NULL REFERENCES "members"("id") ON DELETE cascade, "rating" integer NOT NULL, "comment" text)`;
        await sql`CREATE TABLE IF NOT EXISTS "decisions" ("project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE cascade, "member_id" text NOT NULL REFERENCES "members"("id") ON DELETE cascade, "suggested" double precision NOT NULL, "final" double precision NOT NULL, "reason" text, PRIMARY KEY ("project_id", "member_id"))`;
        await sql`ALTER TABLE "evidence" ALTER COLUMN "url" DROP NOT NULL`.catch(() => {});
        await sql`ALTER TABLE "reviews" ALTER COLUMN "comment" DROP NOT NULL`.catch(() => {});
      } catch {
        // Fallback to memDb if Neon connection fails
        _db = memDb() as unknown as ReturnType<typeof drizzle<typeof schema>>;
      }
    })();
  }
  await _schemaReady;
}

export function db(): ReturnType<typeof drizzle<typeof schema>> {
  const url = cleanDatabaseUrl(process.env.DATABASE_URL);
  if (!url) {
    return memDb() as unknown as ReturnType<typeof drizzle<typeof schema>>;
  }
  if (!_db) {
    try {
      _db = drizzle(neon(url), { schema });
    } catch {
      _db = memDb() as unknown as ReturnType<typeof drizzle<typeof schema>>;
    }
  }
  return _db;
}
export * as s from "./schema";
