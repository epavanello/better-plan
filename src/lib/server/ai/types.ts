import { z } from "zod"

export const aiGenerationOptionsSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  userId: z.string().min(1, "User ID is required"),
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
  // For iterations
  previousContent: z.string().optional(),
  iterationInstruction: z.string().optional()
})

export type AiGenerationOptions = z.infer<typeof aiGenerationOptionsSchema>

export const aiTuningParametersSchema = aiGenerationOptionsSchema.pick({
  maxTokens: true,
  temperature: true,
  styleOverride: true,
  toneOverride: true,
  lengthOverride: true,
  useEmojisOverride: true,
  useHashtagsOverride: true,
  customInstructionsOverride: true
})

export type AiTuningParameters = z.infer<typeof aiTuningParametersSchema>

export const suggestionGenerationOptionsSchema = aiGenerationOptionsSchema
  .omit({
    prompt: true,
    previousContent: true,
    iterationInstruction: true
  })
  .extend({
    basePrompt: z.string().optional(),
    count: z.number()
  })

export type SuggestionGenerationOptions = z.infer<typeof suggestionGenerationOptionsSchema>

export const aiGenerationResultSchema = z.object({
  success: z.boolean(),
  content: z.string().optional(),
  error: z.string().optional(),
  tokensUsed: z.number().optional(),
  model: z.string().optional()
})

export type AiGenerationResult = z.infer<typeof aiGenerationResultSchema>

export const usageLimitCheckSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional()
})

export type UsageLimitCheck = z.infer<typeof usageLimitCheckSchema>

export const aiAccessCheckSchema = z.object({
  canAccess: z.boolean(),
  reason: z.string().optional()
})

export type AiAccessCheck = z.infer<typeof aiAccessCheckSchema>
