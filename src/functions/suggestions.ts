import { db } from "@/database/db"
import { contentSuggestions } from "@/database/schema"
import { getSessionOrThrow } from "@/lib/auth"
import { aiService } from "@/lib/server/ai-service"
import { aiTuningParametersSchema, suggestionGenerationOptionsSchema } from "@/lib/server/ai/types"
import { suggestionService } from "@/lib/server/suggestion-service"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const generateContentSuggestions = createServerFn({
  method: "POST"
})
  .validator(suggestionGenerationOptionsSchema.omit({ userId: true }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!session.user) {
      throw new Error("Unauthorized")
    }

    const results = await aiService.generateContentSuggestions({
      ...data,
      userId: session.user.id
    })

    const successfulSuggestions = results.filter((r) => r.success && r.content)

    if (successfulSuggestions.length === 0) {
      return []
    }

    const suggestionsToInsert = successfulSuggestions.map((r) => ({
      userId: session.user.id,
      integrationId: data.integrationId,
      content: r.content!,
      aiModel: r.model,
      aiPrompt: data.basePrompt
    }))

    const inserted = await db.insert(contentSuggestions).values(suggestionsToInsert).returning()

    return inserted
  })

export const getSuggestions = createServerFn({
  method: "GET"
})
  .validator(
    z.object({
      integrationId: z.string()
    })
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!session.user) {
      throw new Error("Unauthorized")
    }

    return db.query.contentSuggestions.findMany({
      where: and(eq(contentSuggestions.userId, session.user.id), eq(contentSuggestions.integrationId, data.integrationId)),
      orderBy: (suggestions, { desc }) => [desc(suggestions.createdAt)]
    })
  })

export const acceptSuggestion = createServerFn({
  method: "POST"
})
  .validator(
    z.object({
      suggestionId: z.string()
    })
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!session.user) {
      throw new Error("Unauthorized")
    }

    const [updated] = await db
      .update(contentSuggestions)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(and(eq(contentSuggestions.id, data.suggestionId), eq(contentSuggestions.userId, session.user.id)))
      .returning()

    return updated
  })

export const rejectSuggestion = createServerFn({
  method: "POST"
})
  .validator(
    z.object({
      suggestionId: z.string()
    })
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    if (!session.user) {
      throw new Error("Unauthorized")
    }

    const [updated] = await db
      .update(contentSuggestions)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(and(eq(contentSuggestions.id, data.suggestionId), eq(contentSuggestions.userId, session.user.id)))
      .returning()

    return updated
  })

export const updateSuggestionContent = createServerFn({
  method: "POST"
})
  .validator(
    z.object({
      suggestionId: z.string(),
      content: z.string().min(1)
    })
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    return suggestionService.updateContent(session.user.id, data.suggestionId, data.content)
  })

export const regenerateSuggestion = createServerFn({
  method: "POST"
})
  .validator(
    z.object({
      suggestionId: z.string(),
      tuningParameters: aiTuningParametersSchema
    })
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    return suggestionService.regenerate(session.user.id, data.suggestionId, data.tuningParameters)
  })

export const publishSuggestion = createServerFn({
  method: "POST"
})
  .validator(
    z.object({
      suggestionId: z.string()
    })
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    return suggestionService.publish(session.user.id, data.suggestionId)
  })

export const scheduleSuggestion = createServerFn({
  method: "POST"
})
  .validator(
    z.object({
      suggestionId: z.string(),
      scheduledAt: z.date()
    })
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    return suggestionService.schedule(session.user.id, data.suggestionId, data.scheduledAt)
  })
