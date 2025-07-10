import { users } from "@/auth-schema"
import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const PLATFORM_VALUES = ["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"] as const

export type Platform = (typeof PLATFORM_VALUES)[number]

export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey(),
  platform: text("platform", { enum: PLATFORM_VALUES }).notNull(),
  platformAccountId: text("platform_account_id").notNull(),
  platformAccountName: text("platform_account_name").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  scopes: text("scopes"),
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

// Nuova tabella per le app credentials degli utenti
export const userAppCredentials = sqliteTable("user_app_credentials", {
  id: text("id").primaryKey(),
  platform: text("platform", { enum: PLATFORM_VALUES }).notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
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

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id]
  })
}))

export const userAppCredentialsRelations = relations(userAppCredentials, ({ one }) => ({
  user: one(users, {
    fields: [userAppCredentials.userId],
    references: [users.id]
  })
}))
