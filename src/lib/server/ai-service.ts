import { db } from "@/database/db"
import { type Post, type UserContext, aiUsage, posts, subscriptions, userContext } from "@/database/schema"
import { getAiConfig, isAiEnabled, isSaasDeployment } from "@/lib/env"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { and, desc, eq, gte, lte } from "drizzle-orm"
import { z } from "zod"

export type AiGenerationOptions = {
  prompt: string
  userId: string
  integrationId: string
  maxTokens?: number
  temperature?: number
}

export type AiGenerationResult = {
  success: boolean
  content?: string
  error?: string
  tokensUsed?: number
  model?: string
}

export class AiService {
  private config = getAiConfig()

  async generateContent(options: AiGenerationOptions): Promise<AiGenerationResult> {
    try {
      // Check if AI is enabled
      if (!this.config.isEnabled) {
        return { success: false, error: "AI service is not enabled" }
      }

      // Check usage limits if SaaS deployment
      if (this.config.isSaas) {
        const canUse = await this.checkUsageLimits(options.userId)
        if (!canUse.allowed) {
          return { success: false, error: canUse.reason }
        }
      }

      // Get user context for personalization
      const context = await this.getUserContext(options.userId)

      // Get recent posts for style consistency
      const recentPosts = await this.getRecentPosts(options.userId, options.integrationId)

      // Build the system prompt
      const systemPrompt = this.buildSystemPrompt(context, recentPosts)

      // Generate content using OpenAI
      const result = await generateText({
        model: openai(this.config.model),
        system: systemPrompt,
        prompt: options.prompt,
        maxTokens: options.maxTokens || this.config.maxContextWindow,
        temperature: options.temperature || 0.7
      })

      // Track usage if SaaS
      if (this.config.isSaas) {
        await this.trackUsage(options.userId, result.usage?.totalTokens || 0)
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

  private async checkUsageLimits(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get user's subscription
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1)
        .then((rows) => rows[0])

      if (!subscription) {
        return { allowed: false, reason: "Subscribe to Pro plan to access AI features" }
      }

      if (subscription.status !== "active") {
        return {
          allowed: false,
          reason: "Your subscription has expired. Renew to continue using AI"
        }
      }

      // Check if current period is still valid
      const now = new Date()
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < now) {
        return { allowed: false, reason: "Your subscription period has expired. Please renew" }
      }

      // Get current usage for this period
      const currentUsage = await db
        .select()
        .from(aiUsage)
        .where(
          and(
            eq(aiUsage.userId, userId),
            eq(aiUsage.subscriptionId, subscription.id),
            gte(aiUsage.periodStart, subscription.currentPeriodStart || new Date()),
            lte(aiUsage.periodEnd, subscription.currentPeriodEnd || new Date())
          )
        )
        .limit(1)
        .then((rows) => rows[0])

      if (currentUsage) {
        // Check generation limit
        if (currentUsage.generationsUsed >= (subscription.aiGenerationsLimit ?? 0)) {
          return {
            allowed: false,
            reason: "Monthly AI generation limit reached. Upgrade your plan"
          }
        }

        // Check context window limit
        if (currentUsage.contextWindowUsed >= (subscription.aiContextWindowLimit ?? 0)) {
          return { allowed: false, reason: "Monthly AI usage limit reached. Upgrade your plan" }
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error("Error checking usage limits:", error)
      return { allowed: false, reason: "Unable to verify subscription status" }
    }
  }

  private async getUserContext(userId: string) {
    try {
      const context = await db
        .select()
        .from(userContext)
        .where(eq(userContext.userId, userId))
        .limit(1)
        .then((rows) => rows[0])

      return context
    } catch (error) {
      console.error("Error getting user context:", error)
      return null
    }
  }

  private async getRecentPosts(userId: string, integrationId: string, limit = 10) {
    try {
      const recentPosts = await db
        .select()
        .from(posts)
        .where(and(eq(posts.userId, userId), eq(posts.integrationId, integrationId), eq(posts.status, "posted")))
        .orderBy(desc(posts.postedAt))
        .limit(limit)

      return recentPosts
    } catch (error) {
      console.error("Error getting recent posts:", error)
      return []
    }
  }

  private buildSystemPrompt(context: UserContext | null, recentPosts: Post[]): string {
    let systemPrompt = "You are a social media content creator assistant. Your task is to generate engaging, authentic social media posts."

    // Add user context if available
    if (context) {
      systemPrompt += "\n\nUser Profile:"
      if (context.bio) systemPrompt += `\n- Bio: ${context.bio}`
      if (context.profession) systemPrompt += `\n- Profession: ${context.profession}`
      if (context.industry) systemPrompt += `\n- Industry: ${context.industry ?? ""}`
      if (context.targetAudience) systemPrompt += `\n- Target Audience: ${context.targetAudience}`
      if (context.writingStyle) systemPrompt += `\n- Writing Style: ${context.writingStyle}`
      if (context.toneOfVoice) systemPrompt += `\n- Tone of Voice: ${context.toneOfVoice}`
      if (context.customInstructions) systemPrompt += `\n- Custom Instructions: ${context.customInstructions}`
    }

    // Add recent posts for style consistency
    if (recentPosts.length > 0) {
      systemPrompt += "\n\nRecent Posts (for style reference):"
      recentPosts.forEach((post, index) => {
        systemPrompt += `\n${index + 1}. ${post.content}`
      })
      systemPrompt += "\n\nPlease maintain consistency with the writing style and tone shown in these recent posts."
    }

    // Add generation guidelines
    systemPrompt += "\n\nGeneration Guidelines:"
    systemPrompt += "\n- Keep the content authentic and engaging"
    systemPrompt += "\n- Match the user's established voice and style"
    systemPrompt += "\n- Make it appropriate for the target audience"
    systemPrompt += "\n- Focus on value and engagement"

    if (context?.useEmojis) {
      systemPrompt += "\n- Use emojis appropriately"
    }

    if (context?.useHashtags) {
      systemPrompt += "\n- Include relevant hashtags when appropriate"
    }

    return systemPrompt
  }

  private async trackUsage(userId: string, tokensUsed: number) {
    try {
      // Get user's subscription
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1)
        .then((rows) => rows[0])

      if (!subscription) return

      // Get or create usage record for current period
      const now = new Date()
      const periodStart = subscription.currentPeriodStart || now
      const periodEnd = subscription.currentPeriodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const existingUsage = await db
        .select()
        .from(aiUsage)
        .where(
          and(
            eq(aiUsage.userId, userId),
            eq(aiUsage.subscriptionId, subscription.id),
            gte(aiUsage.periodStart, periodStart),
            lte(aiUsage.periodEnd, periodEnd)
          )
        )
        .limit(1)
        .then((rows) => rows[0])

      if (existingUsage) {
        // Update existing usage
        await db
          .update(aiUsage)
          .set({
            generationsUsed: existingUsage.generationsUsed + 1,
            contextWindowUsed: existingUsage.contextWindowUsed + tokensUsed,
            updatedAt: now
          })
          .where(eq(aiUsage.id, existingUsage.id))
      } else {
        // Create new usage record
        await db.insert(aiUsage).values({
          userId,
          subscriptionId: subscription.id,
          generationsUsed: 1,
          contextWindowUsed: tokensUsed,
          periodStart,
          periodEnd
        })
      }
    } catch (error) {
      console.error("Error tracking usage:", error)
    }
  }

  async canUserAccessAi(userId: string): Promise<{ canAccess: boolean; reason?: string }> {
    // Check if AI is enabled globally
    if (!isAiEnabled()) {
      if (isSaasDeployment()) {
        return { canAccess: false, reason: "AI features require a Pro subscription" }
      } else {
        return { canAccess: false, reason: "OpenAI API key not configured" }
      }
    }

    // For self-hosted, if AI is enabled, user has access
    if (!isSaasDeployment()) {
      return { canAccess: true }
    }

    // For SaaS deployment, check subscription and limits
    const limits = await this.checkUsageLimits(userId)
    return { canAccess: limits.allowed, reason: limits.reason }
  }
}

export const aiService = new AiService()

// Schema for API validation
export const generateContentSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  integrationId: z.string().min(1, "Integration ID is required"),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional()
})
