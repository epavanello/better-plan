import { users } from "@/auth-schema"
import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { createInsertSchema } from "drizzle-zod"
import { ulid } from "ulid"

export const SUBSCRIPTION_STATUS_VALUES = ["active", "cancelled", "expired", "pending"] as const
export const SUBSCRIPTION_PLAN_VALUES = ["free", "pro", "enterprise"] as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS_VALUES)[number]
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN_VALUES)[number]

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: SUBSCRIPTION_PLAN_VALUES }).notNull().default("free"),
  status: text("status", { enum: SUBSCRIPTION_STATUS_VALUES }).notNull().default("pending"),

  // Polar.sh integration fields
  polarSubscriptionId: text("polar_subscription_id"),
  polarCustomerId: text("polar_customer_id"),

  // Subscription period
  currentPeriodStart: integer("current_period_start", { mode: "timestamp" }),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),

  // AI usage limits for this subscription
  aiGenerationsLimit: integer("ai_generations_limit").default(0),
  aiContextWindowLimit: integer("ai_context_window_limit").default(0),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull()
})

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id]
  }),
  aiUsage: many(aiUsage)
}))

export const aiUsage = sqliteTable("ai_usage", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),

  // Usage tracking
  generationsUsed: integer("generations_used").default(0).notNull(),
  contextWindowUsed: integer("context_window_used").default(0).notNull(),

  // Period tracking (monthly reset)
  periodStart: integer("period_start", { mode: "timestamp" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp" }).notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull()
})

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
  user: one(users, {
    fields: [aiUsage.userId],
    references: [users.id]
  }),
  subscription: one(subscriptions, {
    fields: [aiUsage.subscriptionId],
    references: [subscriptions.id]
  })
}))

export type Subscription = typeof subscriptions.$inferSelect
export type InsertSubscription = typeof subscriptions.$inferInsert
export type AiUsage = typeof aiUsage.$inferSelect
export type InsertAiUsage = typeof aiUsage.$inferInsert

export const insertSubscriptionSchema = createInsertSchema(subscriptions)
export const insertAiUsageSchema = createInsertSchema(aiUsage)
