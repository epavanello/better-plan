import * as schema from "@/database/schema"
import { envConfig } from "@/lib/env"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

export const client = createClient({
  url: envConfig.DATABASE_URL,
  authToken: envConfig.DATABASE_AUTH_TOKEN
})

export const db = drizzle(client, { schema })
