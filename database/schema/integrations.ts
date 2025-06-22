import { relations } from "drizzle-orm"
import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { users } from "../../auth-schema"

export const platformEnum = pgEnum("platform", [
    "x",
    "reddit",
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
    "linkedin"
])

export type Platform = (typeof platformEnum.enumValues)[number]

export const integrations = pgTable("integrations", {
    id: text("id").primaryKey(),
    platform: platformEnum("platform").notNull(),
    platformAccountId: text("platform_account_id").notNull(),
    platformAccountName: text("platform_account_name").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    scopes: text("scopes"),
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

export const integrationsRelations = relations(integrations, ({ one }) => ({
    user: one(users, {
        fields: [integrations.userId],
        references: [users.id]
    })
}))
