export type AiGenerationOptions = {
  prompt: string
  userId: string
  integrationId: string
  maxTokens?: number
  temperature?: number
  // New tuning parameters
  styleOverride?: "casual" | "formal" | "humorous" | "professional" | "conversational"
  toneOverride?: "friendly" | "professional" | "authoritative" | "inspirational" | "educational"
  lengthOverride?: "short" | "medium" | "long"
  useEmojisOverride?: boolean
  useHashtagsOverride?: boolean
  customInstructionsOverride?: string
  // For iterations
  previousContent?: string
  iterationInstruction?: string
}

export type AiGenerationResult = {
  success: boolean
  content?: string
  error?: string
  tokensUsed?: number
  model?: string
}

export type UsageLimitCheck = {
  allowed: boolean
  reason?: string
}

export type AiAccessCheck = {
  canAccess: boolean
  reason?: string
}
