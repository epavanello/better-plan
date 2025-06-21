import "dotenv/config"
import { defineConfig } from "drizzle-kit"
import { envConfig } from "./lib/env"

export default defineConfig({
    out: "./migrations",
    schema: "./database/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: envConfig.DATABASE_URL
    }
})
