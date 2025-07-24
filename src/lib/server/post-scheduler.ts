import { db } from "@/database/db"
import { postMedia, posts } from "@/database/schema"
import { and, eq, lte } from "drizzle-orm"
import { getIntegrationWithValidToken } from "./integrations"
import { postToSocialMedia } from "./post-service"

export async function processScheduledPosts() {
  console.log("Processing scheduled posts...")

  // Find all scheduled posts that are ready to be posted
  const scheduledPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      integrationId: posts.integrationId,
      userId: posts.userId,
      scheduledAt: posts.scheduledAt,
      failCount: posts.failCount,
      destinationType: posts.destinationType,
      destinationId: posts.destinationId,
      destinationName: posts.destinationName,
      destinationMetadata: posts.destinationMetadata
    })
    .from(posts)
    .where(and(eq(posts.status, "scheduled"), lte(posts.scheduledAt, new Date()), lte(posts.failCount, 3)))

  console.log(`Found ${scheduledPosts.length} posts to process`)

  for (const post of scheduledPosts) {
    try {
      // Get integration with valid token
      const integration = await getIntegrationWithValidToken(post.integrationId, post.userId)

      const media = await db.query.postMedia.findMany({
        where: eq(postMedia.postId, post.id)
      })

      await postToSocialMedia({
        ...post,
        integration: {
          id: integration.id,
          platform: integration.platform,
          platformAccountId: integration.platformAccountId,
          platformAccountName: integration.platformAccountName,
          accessToken: integration.accessToken,
          refreshToken: integration.refreshToken,
          expiresAt: integration.expiresAt
        },
        media: media.length > 0 ? media.map((m) => ({ content: m.content, mimeType: m.mimeType })) : undefined
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
