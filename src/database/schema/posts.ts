import { users } from "@/auth-schema"
import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { createInsertSchema } from "drizzle-zod"
import { ulid } from "ulid"
import { integrations } from "./integrations"

export const POST_STATUS_VALUES = ["draft", "scheduled", "posted", "failed"] as const
export const POST_SOURCE_VALUES = ["native", "imported"] as const

export type PostStatus = (typeof POST_STATUS_VALUES)[number]
export type PostSource = (typeof POST_SOURCE_VALUES)[number]

export const posts = sqliteTable("posts", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => ulid()),
    content: text("content").notNull(),
    source: text("source", { enum: POST_SOURCE_VALUES }).notNull().default("native"),
    status: text("status", { enum: POST_STATUS_VALUES }).notNull().default("draft"),
    scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
    postedAt: integer("posted_at", { mode: "timestamp" }),
    postUrl: text("post_url"),
    failCount: integer("fail_count").default(0),
    failReason: text("fail_reason"),
    integrationId: text("integration_id")
        .notNull()
        .references(() => integrations.id, { onDelete: "cascade" }),

    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .$defaultFn(() => new Date())
        .notNull()
})

export const postsRelations = relations(posts, ({ one }) => ({
    integration: one(integrations, {
        fields: [posts.integrationId],
        references: [integrations.id]
    }),
    user: one(users, {
        fields: [posts.userId],
        references: [users.id]
    })
}))

export type Post = typeof posts.$inferSelect
export type InsertPost = typeof posts.$inferInsert

export const insertPostSchema = createInsertSchema(posts)
