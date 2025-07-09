import { users } from "@/auth-schema"
import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { createInsertSchema } from "drizzle-zod"
import { ulid } from "ulid"

export const userContext = sqliteTable("user_context", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => ulid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),

  // Personal information for AI context
  bio: text("bio"),
  profession: text("profession"),
  industry: text("industry"),
  targetAudience: text("target_audience"),

  // Writing style preferences
  writingStyle: text("writing_style"), // e.g., "formal", "casual", "humorous"
  toneOfVoice: text("tone_of_voice"), // e.g., "professional", "friendly", "authoritative"
  preferredTopics: text("preferred_topics"), // JSON array of topics

  // AI generation preferences
  defaultPostLength: text("default_post_length"), // e.g., "short", "medium", "long"
  useEmojis: integer("use_emojis", { mode: "boolean" }).default(false),
  useHashtags: integer("use_hashtags", { mode: "boolean" }).default(true),

  // Custom instructions for AI
  customInstructions: text("custom_instructions"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull()
})

export const userContextRelations = relations(userContext, ({ one }) => ({
  user: one(users, {
    fields: [userContext.userId],
    references: [users.id]
  })
}))

export type UserContext = typeof userContext.$inferSelect
export type InsertUserContext = typeof userContext.$inferInsert

export const insertUserContextSchema = createInsertSchema(userContext)
