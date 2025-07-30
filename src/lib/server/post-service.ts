import { db } from "@/database/db"
import { type PostMedia, postMedia, posts } from "@/database/schema"
import type { Platform } from "@/database/schema/integrations"
import type { CreatePostInput } from "@/functions/posts"
import { getEffectiveCredentials } from "@/lib/server/integrations"
import { eq } from "drizzle-orm"
import { ulid } from "ulid"
import type { PostData, PostDestination } from "./social-platforms/base-platform"
import { PlatformFactory } from "./social-platforms/platform-factory"

interface CreatePostOptions extends CreatePostInput {
  userId: string
  source?: "native" | "imported" | "ai-generated"
  // AI related fields
  aiGenerated?: boolean
  aiPrompt?: string
  aiModel?: string
}

class PostService {
  async create(options: CreatePostOptions) {
    const {
      userId,
      integrationId,
      content,
      scheduledAt,
      destination,
      additionalFields,
      media,
      source = "native",
      aiGenerated = false,
      aiPrompt,
      aiModel
    } = options

    const postId = ulid()

    const [post] = await db
      .insert(posts)
      .values({
        id: postId,
        userId,
        integrationId,
        content,
        status: scheduledAt ? "scheduled" : "draft",
        scheduledAt,
        source,
        // Destination fields
        destinationType: destination?.type,
        destinationId: destination?.id,
        destinationName: destination?.name,
        destinationMetadata: destination?.metadata ? JSON.stringify(destination.metadata) : undefined,
        // Additional fields
        additionalFields: additionalFields ? JSON.stringify(additionalFields) : undefined,
        // AI fields
        aiGenerated,
        aiPrompt,
        aiModel
      })
      .returning()

    let insertedMedia: PostMedia[] = []

    // Save media if provided
    if (media && media.length > 0) {
      const mediaToInsert = media.map((m) => ({
        postId: post.id,
        content: m.content,
        mimeType: m.mimeType
      }))
      insertedMedia = await db.insert(postMedia).values(mediaToInsert).returning()
    }

    if (!scheduledAt) {
      // If not scheduled, publish immediately
      return {
        post: {
          ...post,
          ...(await this.publish(post.id))
        },
        media: insertedMedia
      }
    }

    return {
      post,
      media: insertedMedia
    }
  }

  async publish(postId: string) {
    // First check the current status
    const currentPost = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      columns: { status: true, userId: true }
    })

    if (!currentPost) {
      throw new Error("Post not found")
    }

    if (currentPost.status === "posted") {
      console.warn(`Post ${postId} has already been published.`)
      return
    }

    const postData = await this.getPostData(postId)
    const platform = PlatformFactory.getPlatform(postData.integration.platform)
    const credentials = await getEffectiveCredentials(postData.integration.platform as Platform, currentPost.userId)

    const result = await platform.post(postData, credentials)

    if (result.success) {
      const [updatedPost] = await db
        .update(posts)
        .set({
          status: "posted",
          postedAt: new Date(),
          postUrl: result.postUrl
        })
        .where(eq(posts.id, postId))
        .returning()

      console.log(`Successfully posted to ${postData.integration.platform}: ${postId}`)
      return updatedPost
    }

    await db
      .update(posts)
      .set({
        status: "failed",
        failReason: result.error || "Failed to post to social media"
      })
      .where(eq(posts.id, postId))
    throw new Error(result.error || `Failed to post to ${postData.integration.platform}`)
  }

  private async getPostData(postId: string): Promise<PostData> {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        integration: true,
        media: true
      }
    })

    if (!post) {
      throw new Error("Post not found")
    }

    // Parse destination data if present
    const destination: PostDestination | undefined = post.destinationType
      ? {
          type: post.destinationType,
          id: post.destinationId ?? "",
          name: post.destinationName ?? "",
          metadata: post.destinationMetadata ? JSON.parse(post.destinationMetadata) : undefined
        }
      : undefined

    // Parse additional fields if present
    const additionalFields = post.additionalFields ? JSON.parse(post.additionalFields) : undefined

    // Format media data
    const media =
      post.media.length > 0
        ? post.media.map((m) => ({
            content: m.content,
            mimeType: m.mimeType,
            id: m.id
          }))
        : undefined

    return {
      id: post.id,
      content: post.content,
      userId: post.userId,
      integration: post.integration,
      destination,
      additionalFields,
      media
    }
  }
}

export const postService = new PostService()
