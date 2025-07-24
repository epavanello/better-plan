import { runMigrations } from "@/database/migrate"
import { initializeNativeScheduler } from "@/lib/server/native-scheduler"
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server"
import { createRouter } from "./router"

if (!globalThis.app_initialized) {
  runMigrations()
  initializeNativeScheduler()
  globalThis.app_initialized = true
}

export default createStartHandler({
  createRouter
})(defaultStreamHandler)
