import "dotenv/config"
import { envConfig } from "@/lib/env"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
    out: "./migrations",
    schema: "./src/database/schema/index.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: envConfig.DATABASE_URL
    }
})
