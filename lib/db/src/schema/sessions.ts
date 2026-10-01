import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { gymMembersTable } from "./members";

export const gymSessionsTable = pgTable("gym_sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  coach: text("coach").notNull(),
  capacity: integer("capacity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gymSessionBookingsTable = pgTable(
  "gym_session_bookings",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => gymSessionsTable.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => gymMembersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("gym_session_member_unique").on(table.sessionId, table.memberId)],
);

export const insertGymSessionSchema = createInsertSchema(gymSessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGymSession = z.infer<typeof insertGymSessionSchema>;
export type GymSession = typeof gymSessionsTable.$inferSelect;