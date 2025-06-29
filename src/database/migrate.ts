import { migrate } from "drizzle-orm/node-postgres/migrator"
import { db } from "./db"

export async function runMigrations() {
    try {
        console.log("Checking for pending migrations...")
        await migrate(db, { migrationsFolder: "migrations" })
        console.log("Migrations check finished.")
    } catch (err) {
        console.error("Migrations failed:", err)
        process.exit(1)
    }
}
