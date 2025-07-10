import { db } from "@/database/db"
import { posts } from "@/database/schema"
import { integrations } from "@/database/schema/integrations"
import { and, eq, lte } from "drizzle-orm"
import { postToSocialMedia } from "./post-service"

export async function processScheduledPosts() {
  console.log("Processing scheduled posts...")

  // Trova tutti i post schedulati che sono pronti per essere postati
  const scheduledPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      integrationId: posts.integrationId,
      userId: posts.userId,
      scheduledAt: posts.scheduledAt,
      failCount: posts.failCount,
      integration: {
        id: integrations.id,
        platform: integrations.platform,
        platformAccountId: integrations.platformAccountId,
        platformAccountName: integrations.platformAccountName,
        accessToken: integrations.accessToken
      }
    })
    .from(posts)
    .innerJoin(integrations, eq(posts.integrationId, integrations.id))
    .where(and(eq(posts.status, "scheduled"), lte(posts.scheduledAt, new Date()), lte(posts.failCount, 3)))

  console.log(`Found ${scheduledPosts.length} posts to process`)

  for (const post of scheduledPosts) {
    try {
      await postToSocialMedia(post)
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
