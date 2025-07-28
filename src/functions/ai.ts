import { db } from "@/database/db"
import { insertUserContextSchema, userContext } from "@/database/schema"
import { getSessionOrThrow } from "@/lib/auth"
import { aiService } from "@/lib/server/ai-service"
import { aiGenerationOptionsSchema } from "@/lib/server/ai/types"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

const generateContentSchema = aiGenerationOptionsSchema.omit({ userId: true })

export const generateAiContent = createServerFn({
  method: "POST"
})
  .validator(generateContentSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    // Check if user can access AI features
    const accessCheck = await aiService.canUserAccessAi(session.user.id)
    if (!accessCheck.canAccess) {
      throw new Error(accessCheck.reason || "AI access denied")
    }

    // Generate content with overrides
    const result = await aiService.generateContent({
      ...data,
      userId: session.user.id
    })

    if (!result.success) {
      throw new Error(result.error || "Failed to generate content")
    }

    return {
      content: result.content,
      tokensUsed: result.tokensUsed,
      model: result.model
    }
  })

export const checkAiAccess = createServerFn({
  method: "GET"
}).handler(async () => {
  const session = await getSessionOrThrow()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const accessCheck = await aiService.canUserAccessAi(session.user.id)

  return {
    canAccess: accessCheck.canAccess,
    reason: accessCheck.reason
  }
})

export const getUserContext = createServerFn({
  method: "GET"
}).handler(async () => {
  const session = await getSessionOrThrow()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const context = await db
    .select()
    .from(userContext)
    .where(eq(userContext.userId, session.user.id))
    .limit(1)
    .then((rows) => rows[0])

  return context ?? {}
})

export const updateUserContext = createServerFn({
  method: "POST"
})
  .validator(insertUserContextSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true }))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    // Check if user context already exists
    const existingContext = await db
      .select()
      .from(userContext)
      .where(eq(userContext.userId, session.user.id))
      .limit(1)
      .then((rows) => rows[0])

    const now = new Date()

    if (existingContext) {
      // Update existing context
      const updated = await db
        .update(userContext)
        .set({
          ...data,
          updatedAt: now
        })
        .where(eq(userContext.userId, session.user.id))
        .returning()

      return updated[0]
    }

    // Create new context
    const inserted = await db
      .insert(userContext)
      .values({
        userId: session.user.id,
        ...data,
        createdAt: now,
        updatedAt: now
      })
      .returning()

    return inserted[0]
  })
