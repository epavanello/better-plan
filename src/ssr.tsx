import { runMigrations } from "@/database/migrate"
import { initializeNativeScheduler } from "@/lib/server/native-scheduler"
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server"
import { createRouter } from "./router"

runMigrations()
initializeNativeScheduler()

export default createStartHandler({
  createRouter
})(defaultStreamHandler)
