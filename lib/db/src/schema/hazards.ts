import { sql } from "drizzle-orm";
import { doublePrecision, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const hazardsTable = pgTable("hazards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  photoUrl: varchar("photo_url"),
  reportedBy: varchar("reported_by").notNull().references(() => usersTable.id),
  reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  confirmationCount: integer("confirmation_count").notNull().default(0),
});

export const hazardConfirmationsTable = pgTable("hazard_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hazardId: varchar("hazard_id").notNull().references(() => hazardsTable.id),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
  photoUrl: varchar("photo_url"),
});

export type Hazard = typeof hazardsTable.$inferSelect;
export type InsertHazard = typeof hazardsTable.$inferInsert;
export type HazardConfirmation = typeof hazardConfirmationsTable.$inferSelect;
