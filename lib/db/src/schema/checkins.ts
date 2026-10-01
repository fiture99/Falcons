import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { gymMembersTable } from "./members";

export const gymCheckinsTable = pgTable("gym_checkins", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => gymMembersTable.id, { onDelete: "cascade" }),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
  allowed: boolean("allowed").notNull(),
  message: text("message").notNull(),
});

export const insertGymCheckinSchema = createInsertSchema(gymCheckinsTable).omit({
  id: true,
  checkedInAt: true,
});
export type InsertGymCheckin = z.infer<typeof insertGymCheckinSchema>;
export type GymCheckin = typeof gymCheckinsTable.$inferSelect;