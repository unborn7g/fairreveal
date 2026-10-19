import { pgTable, text, integer, boolean, timestamp, doublePrecision, primaryKey } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  phase: text("phase").notNull().default("setup"), // setup|active|reviewing|unlocked|approved
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const members = pgTable("members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"), // instructor|member
  token: text("token").notNull().unique(),
  agreedAt: timestamp("agreed_at"),
  submittedAt: timestamp("submitted_at"),
});

export const commitments = pgTable("commitments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  ownerId: text("owner_id").notNull().references(() => members.id),
  title: text("title").notNull(),
  weight: integer("weight").notNull(),
  fulfilledAt: timestamp("fulfilled_at"),
});

export const evidence = pgTable("evidence", {
  id: text("id").primaryKey(),
  commitmentId: text("commitment_id").notNull().references(() => commitments.id),
  authorId: text("author_id").notNull().references(() => members.id),
  note: text("note").notNull(),
  url: text("url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  reviewerId: text("reviewer_id").notNull().references(() => members.id),
  revieweeId: text("reviewee_id").notNull().references(() => members.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
});

export const decisions = pgTable("decisions", {
  projectId: text("project_id").notNull().references(() => projects.id),
  memberId: text("member_id").notNull().references(() => members.id),
  suggested: doublePrecision("suggested").notNull(),
  final: doublePrecision("final").notNull(),
  reason: text("reason"),
}, (t) => [primaryKey({ columns: [t.projectId, t.memberId] })]);
