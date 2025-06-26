import { users } from "@/auth-schema"
import { relations } from "drizzle-orm"
import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { ulid } from "ulid"
import { integrations } from "./integrations"

export const postStatusEnum = pgEnum("post_status", ["draft", "scheduled", "posted", "failed"])

export const posts = pgTable("posts", {
    id: varchar("id")
        .primaryKey()
        .$defaultFn(() => ulid()),
    content: text("content").notNull(),
    status: postStatusEnum("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at"),
    postedAt: timestamp("posted_at"),
    postUrl: text("post_url"),
    failCount: integer("fail_count").default(0),
    failReason: text("fail_reason"),
    integrationId: text("integration_id")
        .notNull()
        .references(() => integrations.id, { onDelete: "cascade" }),

    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
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
