import { getSessionOrThrow } from "@/lib/auth"
import { aiService } from "@/lib/server/ai-service"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

const generateContentSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  integrationId: z.string().min(1, "Integration ID is required"),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional()
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

    // Generate content
    const result = await aiService.generateContent({
      prompt: data.prompt,
      userId: session.user.id,
      integrationId: data.integrationId,
      maxTokens: data.maxTokens,
      temperature: data.temperature
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
