import { db } from "@/database/db"
import { posts } from "@/database/schema"
import { and, eq, lte } from "drizzle-orm"
import { getIntegrationWithValidToken } from "./integrations"
import { postToSocialMedia } from "./post-service"
import type { PostDestination } from "./social-platforms/base-platform"

export async function processScheduledPosts() {
  console.log("Processing scheduled posts...")

  // Find all scheduled posts that are ready to be posted
  const scheduledPosts = await db.query.posts.findMany({
    where: and(eq(posts.status, "scheduled"), lte(posts.scheduledAt, new Date()), lte(posts.failCount, 3)),
    with: {
      media: true
    }
  })

  console.log(`Found ${scheduledPosts.length} posts to process`)

  for (const post of scheduledPosts) {
    try {
      // Get integration with valid token
      const integration = await getIntegrationWithValidToken(post.integrationId, post.userId)

      const destination: PostDestination | undefined = post.destinationType
        ? {
            type: post.destinationType,
            id: post.destinationId ?? "",
            name: post.destinationName ?? "",
            metadata: post.destinationMetadata ? JSON.parse(post.destinationMetadata) : undefined
          }
        : undefined

      await postToSocialMedia({
        id: post.id,
        content: post.content,
        userId: post.userId,
        destination: destination,
        additionalFields: post.additionalFields ? JSON.parse(post.additionalFields) : undefined,
        media: post.media.length > 0 ? post.media.map((m) => ({ content: m.content, mimeType: m.mimeType, id: m.id })) : undefined,
        integration
      })
    } catch (error) {
      console.error(`Failed to process post ${post.id}:`, error)
      await db
        .update(posts)
        .set({
          status: "failed",
          failReason: error instanceof Error ? error.message : "Unknown error",
          failCount: (post.failCount ?? 0) + 1
        })
        .where(eq(posts.id, post.id))
    }
  }
}
