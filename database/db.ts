import { envConfig } from "@/lib/env"
import { drizzle } from "drizzle-orm/node-postgres"
export const db = drizzle(envConfig.DATABASE_URL)
