import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { gymMembersTable } from "./members";

export const gymPaymentsTable = pgTable("gym_payments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => gymMembersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGymPaymentSchema = createInsertSchema(gymPaymentsTable).omit({
  id: true,
  paidAt: true,
});
export type InsertGymPayment = z.infer<typeof insertGymPaymentSchema>;
export type GymPayment = typeof gymPaymentsTable.$inferSelect;