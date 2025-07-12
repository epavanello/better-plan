import { getSessionOrThrow } from "@/lib/auth"
import { aiService } from "@/lib/server/ai-service"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { db } from "@/database/db"
import { userContext, type UserContext, type InsertUserContext, insertUserContextSchema } from "@/database/schema"
import { eq } from "drizzle-orm"

const generateContentSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  integrationId: z.string().min(1, "Integration ID is required"),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  // New tuning parameters
  styleOverride: z.enum(["casual", "formal", "humorous", "professional", "conversational"]).optional(),
  toneOverride: z.enum(["friendly", "professional", "authoritative", "inspirational", "educational"]).optional(),
  lengthOverride: z.enum(["short", "medium", "long"]).optional(),
  useEmojisOverride: z.boolean().optional(),
  useHashtagsOverride: z.boolean().optional(),
  customInstructionsOverride: z.string().optional(),
  // For iterations - previous content to improve upon
  previousContent: z.string().optional(),
  iterationInstruction: z.string().optional()
})

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
      prompt: data.prompt,
      userId: session.user.id,
      integrationId: data.integrationId,
      maxTokens: data.maxTokens,
      temperature: data.temperature,
      styleOverride: data.styleOverride,
      toneOverride: data.toneOverride,
      lengthOverride: data.lengthOverride,
      useEmojisOverride: data.useEmojisOverride,
      useHashtagsOverride: data.useHashtagsOverride,
      customInstructionsOverride: data.customInstructionsOverride,
      previousContent: data.previousContent,
      iterationInstruction: data.iterationInstruction
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

  return context || null
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
