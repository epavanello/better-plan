import { db } from "@/database/db"
import { type Post, type UserContext, posts, userContext } from "@/database/schema"
import { and, desc, eq } from "drizzle-orm"

export class AiContextService {
  async getUserContext(userId: string): Promise<UserContext | null> {
    try {
      const context = await db
        .select()
        .from(userContext)
        .where(eq(userContext.userId, userId))
        .limit(1)
        .then((rows) => rows[0])

      return context
    } catch (error) {
      console.error("Error getting user context:", error)
      return null
    }
  }

  async getRecentPosts(userId: string, integrationId: string, limit = 10): Promise<Post[]> {
    try {
      const recentPosts = await db
        .select()
        .from(posts)
        .where(and(eq(posts.userId, userId), eq(posts.integrationId, integrationId), eq(posts.status, "posted")))
        .orderBy(desc(posts.postedAt))
        .limit(limit)

      return recentPosts
    } catch (error) {
      console.error("Error getting recent posts:", error)
      return []
    }
  }
}
