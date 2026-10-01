import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { gymMembersTable } from "./members";

export const gymTrainingLogsTable = pgTable("gym_training_logs", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => gymMembersTable.id, { onDelete: "cascade" }),
  exercise: text("exercise").notNull(),
  sets: integer("sets").notNull(),
  reps: text("reps").notNull(),
  load: text("load").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGymTrainingLogSchema = createInsertSchema(gymTrainingLogsTable).omit({
  id: true,
  loggedAt: true,
});
export type InsertGymTrainingLog = z.infer<typeof insertGymTrainingLogSchema>;
export type GymTrainingLog = typeof gymTrainingLogsTable.$inferSelect;