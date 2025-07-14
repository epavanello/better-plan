import { db } from "@/database/db"
import { postDestinations } from "@/database/schema"
import type { Platform } from "@/database/schema/integrations"
import { eq, sql } from "drizzle-orm"
import type { PostDestination } from "../social-platforms/base-platform"

export class PostDestinationService {
  async saveRecentDestination(userId: string, platform: Platform, destination: PostDestination): Promise<void> {
    const existingDestination = await db.query.postDestinations.findFirst({
      where: (postDestinations, { eq, and }) =>
        and(
          eq(postDestinations.userId, userId),
          eq(postDestinations.platform, platform),
          eq(postDestinations.destinationId, destination.id)
        )
    })

    if (existingDestination) {
      // Update existing destination
      await db
        .update(postDestinations)
        .set({
          useCount: sql`${postDestinations.useCount} + 1`,
          lastUsedAt: new Date(),
          destinationName: destination.name,
          destinationMetadata: destination.metadata ? JSON.stringify(destination.metadata) : undefined,
          updatedAt: new Date()
        })
        .where(eq(postDestinations.id, existingDestination.id))
    } else {
      // Create new destination
      await db.insert(postDestinations).values({
        userId,
        platform,
        destinationType: destination.type,
        destinationId: destination.id,
        destinationName: destination.name,
        destinationMetadata: destination.metadata ? JSON.stringify(destination.metadata) : undefined,
        lastUsedAt: new Date(),
        useCount: 1
      })
    }
  }

  async getRecentDestinations(userId: string, platform: Platform, limit = 10) {
    const recentDestinations = await db.query.postDestinations.findMany({
      where: (postDestinations, { eq, and }) => and(eq(postDestinations.userId, userId), eq(postDestinations.platform, platform)),
      orderBy: (postDestinations, { desc }) => desc(postDestinations.lastUsedAt),
      limit
    })

    return recentDestinations.map((dest) => {
      let metadata: Record<string, unknown> | undefined
      try {
        metadata = dest.destinationMetadata ? JSON.parse(dest.destinationMetadata) : undefined
      } catch {
        metadata = undefined
      }

      return {
        type: dest.destinationType,
        id: dest.destinationId,
        name: dest.destinationName,
        description: metadata?.description as string | undefined
      }
    })
  }
}
