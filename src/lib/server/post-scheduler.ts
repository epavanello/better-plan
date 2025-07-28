import { db } from "@/database/db"
import { posts } from "@/database/schema"
import { and, eq, lte } from "drizzle-orm"
import { getIntegrationWithValidToken } from "./integrations"
import { postService } from "./post-service"

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
      // Use the post service to publish the post
      await postService.publish(post.id)
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
