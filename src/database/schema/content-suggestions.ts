import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { ulid } from "ulid"
import { users } from "../../auth-schema"
import { integrations } from "./integrations"
import { posts } from "./posts"

export const contentSuggestions = sqliteTable("content_suggestions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  integrationId: text("integration_id")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  status: text("status", { enum: ["draft", "accepted", "rejected"] })
    .notNull()
    .default("draft"),
  aiPrompt: text("ai_prompt"),
  aiModel: text("ai_model"),
  aiParameters: text("ai_parameters"),
  generationHistory: text("generation_history"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  postedAt: integer("posted_at", { mode: "timestamp" }),
  postId: text("post_id").references(() => posts.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
})

export const contentSuggestionsRelations = relations(contentSuggestions, ({ one }) => ({
  user: one(users, {
    fields: [contentSuggestions.userId],
    references: [users.id]
  }),
  integration: one(integrations, {
    fields: [contentSuggestions.integrationId],
    references: [integrations.id]
  }),
  post: one(posts, {
    fields: [contentSuggestions.postId],
    references: [posts.id]
  })
}))

export type ContentSuggestion = typeof contentSuggestions.$inferSelect
