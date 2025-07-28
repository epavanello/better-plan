import { getAiConfig } from "@/lib/env"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { AiContextService } from "./ai/context-service"
import { AiPromptBuilder } from "./ai/prompt-builder"
import type { AiAccessCheck, AiGenerationOptions, AiGenerationResult, SuggestionGenerationOptions } from "./ai/types"
import { AiUsageService } from "./ai/usage-service"

export class AiService {
  private config = getAiConfig()
  private contextService = new AiContextService()
  private usageService = new AiUsageService()
  private promptBuilder = new AiPromptBuilder()

  async generateContent(options: AiGenerationOptions): Promise<AiGenerationResult> {
    try {
      // Check if AI is enabled
      if (!this.config.isEnabled) {
        return { success: false, error: "AI service is not enabled" }
      }

      // Check usage limits if SaaS deployment
      if (this.config.isSaas) {
        const canUse = await this.usageService.checkUsageLimits(options.userId)
        if (!canUse.allowed) {
          return { success: false, error: canUse.reason }
        }
      }

      // Get user context for personalization
      const context = await this.contextService.getUserContext(options.userId)

      // Get recent posts for style consistency
      const recentPosts = await this.contextService.getRecentPosts(options.userId, options.integrationId)

      // Build the system prompt
      const systemPrompt = this.promptBuilder.buildSystemPrompt(context, recentPosts, options)

      // Generate content using OpenAI
      const result = await generateText({
        model: openai(this.config.model),
        system: systemPrompt,
        prompt: options.prompt,
        maxTokens: options.maxTokens || this.config.maxContextWindow,
        temperature: options.temperature ?? 0.7
      })

      // Track usage if SaaS
      if (this.config.isSaas) {
        await this.usageService.trackUsage(options.userId, result.usage?.totalTokens || 0)
      }

      return {
        success: true,
        content: result.text,
        tokensUsed: result.usage?.totalTokens,
        model: this.config.model
      }
    } catch (error) {
      console.error("AI generation error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  async generateContentSuggestions(options: SuggestionGenerationOptions): Promise<AiGenerationResult[]> {
    const { count, basePrompt, ...restOfOptions } = options

    const generationPromises = Array.from({ length: count }, () => {
      const prompt = basePrompt || "Suggest a social media post about a relevant topic for my audience."
      return this.generateContent({ ...restOfOptions, prompt })
    })

    const results = await Promise.all(generationPromises)
    return results
  }

  async generateSingleSuggestion(options: SuggestionGenerationOptions): Promise<AiGenerationResult> {
    const { basePrompt, ...restOfOptions } = options
    const prompt = basePrompt || "Suggest a social media post about a relevant topic for my audience."
    return this.generateContent({ ...restOfOptions, prompt })
  }

  async canUserAccessAi(userId: string): Promise<AiAccessCheck> {
    try {
      // Check if AI is enabled
      if (!this.config.isEnabled) {
        return { canAccess: false, reason: "AI service is not enabled" }
      }

      // For self-hosted, always allow access
      if (!this.config.isSaas) {
        return { canAccess: true }
      }

      // For SaaS, check usage limits
      const canUse = await this.usageService.checkUsageLimits(userId)
      return {
        canAccess: canUse.allowed,
        reason: canUse.reason
      }
    } catch (error) {
      console.error("Error checking AI access:", error)
      return { canAccess: false, reason: "Unable to verify AI access" }
    }
  }
}

// Export singleton instance
export const aiService = new AiService()
