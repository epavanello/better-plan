import { runMigrations } from "@/database/migrate"
import { processScheduledPosts } from "@/lib/server/post-scheduler"
import { getRouterManifest } from "@tanstack/react-start/router-manifest"
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server"
import cron from "node-cron"
import { createRouter } from "./router"

runMigrations()

// Avvia il cron job per processare i post schedulati ogni 2 minuti
cron.schedule("*/2 * * * *", async () => {
    try {
        await processScheduledPosts()
    } catch (error) {
        console.error("Error processing scheduled posts:", error)
    }
})

console.log("Post scheduler started - checking every 2 minutes")

export default createStartHandler({
    createRouter,
    getRouterManifest
})(defaultStreamHandler)
