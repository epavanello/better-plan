import { runMigrations } from "@/database/migrate"
import { getRouterManifest } from "@tanstack/react-start/router-manifest"
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server"
import { createRouter } from "./router"
import { initializeNativeScheduler } from "@/lib/server/native-scheduler"

runMigrations()
initializeNativeScheduler()

export default createStartHandler({
    createRouter,
    getRouterManifest
})(defaultStreamHandler)
