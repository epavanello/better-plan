import { db } from "@/database/db"
import { aiUsage, subscriptions } from "@/database/schema"
import { and, desc, eq, gte, lte } from "drizzle-orm"
import type { UsageLimitCheck } from "./types"

export class AiUsageService {
  async checkUsageLimits(userId: string): Promise<UsageLimitCheck> {
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

  async trackUsage(userId: string, tokensUsed: number): Promise<void> {
    try {
      // Get current subscription
      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1)
        .then((rows) => rows[0])

      if (!subscription) {
        console.warn("No subscription found for user:", userId)
        return
      }

      // Get or create usage record for current period
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
        // Update existing usage record
        await db
          .update(aiUsage)
          .set({
            generationsUsed: currentUsage.generationsUsed + 1,
            contextWindowUsed: currentUsage.contextWindowUsed + tokensUsed,
            updatedAt: new Date()
          })
          .where(eq(aiUsage.id, currentUsage.id))
      } else {
        // Create new usage record
        await db.insert(aiUsage).values({
          userId,
          subscriptionId: subscription.id,
          periodStart: subscription.currentPeriodStart || new Date(),
          periodEnd: subscription.currentPeriodEnd || new Date(),
          generationsUsed: 1,
          contextWindowUsed: tokensUsed
        })
      }
    } catch (error) {
      console.error("Error tracking AI usage:", error)
    }
  }
}
