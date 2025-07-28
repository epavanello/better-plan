import { db } from "@/database/db"
import { contentSuggestions } from "@/database/schema"
import { and, eq } from "drizzle-orm"
import { aiService } from "./ai-service"
import type { AiTuningParameters } from "./ai/types"
import { postService } from "./post-service"

class SuggestionService {
  async findOrThrow(userId: string, suggestionId: string) {
    const suggestion = await db.query.contentSuggestions.findFirst({
      where: and(eq(contentSuggestions.id, suggestionId), eq(contentSuggestions.userId, userId)),
      with: {
        integration: true
      }
    })
    if (!suggestion) {
      throw new Error("Suggestion not found")
    }
    return suggestion
  }

  async updateContent(userId: string, suggestionId: string, newContent: string) {
    await this.findOrThrow(userId, suggestionId)

    const [updated] = await db
      .update(contentSuggestions)
      .set({ content: newContent, updatedAt: new Date() })
      .where(and(eq(contentSuggestions.id, suggestionId), eq(contentSuggestions.userId, userId)))
      .returning()

    return updated
  }

  async regenerate(userId: string, suggestionId: string, tuningParameters: AiTuningParameters) {
    const originalSuggestion = await this.findOrThrow(userId, suggestionId)

    const result = await aiService.generateSingleSuggestion({
      userId,
      integrationId: originalSuggestion.integrationId,
      basePrompt: originalSuggestion.aiPrompt ?? undefined,
      count: 1,
      ...tuningParameters
    })

    if (!result.success || !result.content) {
      throw new Error(result.error || "Failed to regenerate suggestion")
    }

    const [updated] = await db
      .update(contentSuggestions)
      .set({
        content: result.content,
        aiModel: result.model,
        aiParameters: JSON.stringify(tuningParameters),
        updatedAt: new Date()
      })
      .where(and(eq(contentSuggestions.id, suggestionId), eq(contentSuggestions.userId, userId)))
      .returning()

    return updated
  }

  async publish(userId: string, suggestionId: string) {
    const suggestion = await this.findOrThrow(userId, suggestionId)

    if (suggestion.status !== "accepted") {
      throw new Error("Only accepted suggestions can be published")
    }
    if (suggestion.postId) {
      throw new Error("Suggestion has already been published")
    }

    const post = await postService.create({
      userId,
      integrationId: suggestion.integrationId,
      content: suggestion.content
    })

    const [updated] = await db
      .update(contentSuggestions)
      .set({ postId: post.post.id, postedAt: new Date(), updatedAt: new Date() })
      .where(eq(contentSuggestions.id, suggestion.id))
      .returning()

    return { post: post.post, suggestion: updated }
  }

  async schedule(userId: string, suggestionId: string, scheduledAt: Date) {
    const suggestion = await this.findOrThrow(userId, suggestionId)

    if (suggestion.status !== "accepted") {
      throw new Error("Only accepted suggestions can be scheduled")
    }
    if (suggestion.postId) {
      throw new Error("Suggestion has already been published or scheduled")
    }

    const newPost = await postService.create({
      userId,
      integrationId: suggestion.integrationId,
      content: suggestion.content,
      scheduledAt
    })

    const [updated] = await db
      .update(contentSuggestions)
      .set({ postId: newPost.post.id, scheduledAt, updatedAt: new Date() })
      .where(eq(contentSuggestions.id, suggestion.id))
      .returning()

    return { post: newPost.post, suggestion: updated }
  }
}

export const suggestionService = new SuggestionService()
