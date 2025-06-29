import * as schema from "@/database/schema"
import { envConfig } from "@/lib/env"
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"

export const pool = new pg.Pool({
    connectionString: envConfig.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
})

export const db = drizzle({ client: pool, schema })
