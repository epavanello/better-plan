import { db } from "@/database/db"
import { postMedia } from "@/database/schema"
import { createServerFileRoute } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"

export const ServerRoute = createServerFileRoute("/api/media/$mediaId").methods({
  GET: async ({ params }) => {
    const mediaId = params.mediaId

    if (!mediaId) {
      return new Response("Media ID is required", { status: 400 })
    }

    try {
      const media = await db.select().from(postMedia).where(eq(postMedia.id, mediaId)).get()

      if (!media) {
        return new Response("Media not found", { status: 404 })
      }

      const buffer = Buffer.from(media.content, "base64")

      const headers = new Headers()
      headers.set("Content-Type", media.mimeType)
      headers.set("Content-Length", buffer.length.toString())
      headers.set("Cache-Control", "public, max-age=31536000, immutable")

      return new Response(buffer, {
        status: 200,
        headers
      })
    } catch (error) {
      console.error(`Failed to retrieve media ${mediaId}:`, error)
      return new Response("Internal Server Error", { status: 500 })
    }
  }
})
