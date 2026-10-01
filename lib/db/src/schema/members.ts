import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const gymMembersTable = pgTable("gym_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  plan: text("plan").notNull(),
  status: text("status").notNull().default("active"),
  email: text("email"),
  phone: text("phone"),
  injury: text("injury"),
  membershipEndsAt: timestamp("membership_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGymMemberSchema = createInsertSchema(gymMembersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGymMember = z.infer<typeof insertGymMemberSchema>;
export type GymMember = typeof gymMembersTable.$inferSelect;