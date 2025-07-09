import { processScheduledPosts } from "./post-scheduler"

let schedulerInitialized = false
let intervalId: NodeJS.Timeout | null = null

export function initializeNativeScheduler() {
  if (schedulerInitialized) {
    console.log("Native post scheduler already initialized")
    return
  }

  try {
    // Usa setInterval nativo per processare i post ogni 2 minuti (120000 ms)
    intervalId = setInterval(
      async () => {
        try {
          await processScheduledPosts()
        } catch (error) {
          console.error("Error processing scheduled posts:", error)
        }
      },
      2 * 60 * 1000
    ) // 2 minuti

    schedulerInitialized = true
    console.log("Native post scheduler started - checking every 2 minutes")
  } catch (error) {
    console.error("Failed to initialize native post scheduler:", error)
  }
}

export function stopNativeScheduler() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    schedulerInitialized = false
    console.log("Native post scheduler stopped")
  }
}
