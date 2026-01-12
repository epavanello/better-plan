import { getIntegrations } from "@/functions/integrations"
import { createPost } from "@/functions/posts"
import { getSessionOrThrow } from "@/lib/auth"
import { getAiConfig } from "@/lib/env"
import { AiContextService } from "@/lib/server/ai/context-service"
import { AiPromptBuilder } from "@/lib/server/ai/prompt-builder"
import { openai } from "@ai-sdk/openai"
import { createServerFileRoute } from "@tanstack/react-start/server"
import { streamText, tool } from "ai"
import { z } from "zod"

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string()
    })
  ),
  integrationId: z.string()
})

export const ServerRoute = createServerFileRoute("/api/chat").methods({
  POST: async ({ request }) => {
    try {
      const session = await getSessionOrThrow()
      if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 })
      }

      const body = await request.json()
      const { messages, integrationId } = chatRequestSchema.parse(body)

      const config = getAiConfig()
      if (!config.isEnabled) {
        return new Response("AI service not enabled", { status: 503 })
      }

      // Get user context and recent posts for better AI responses
      const contextService = new AiContextService()
      const promptBuilder = new AiPromptBuilder()

      const context = await contextService.getUserContext(session.user.id)
      const recentPosts = await contextService.getRecentPosts(session.user.id, integrationId)

      // Get user integrations for the tool
      const integrations = await getIntegrations()
      const currentIntegration = integrations.find((i) => i.id === integrationId)

      const systemPrompt = promptBuilder.buildSystemPrompt(context, recentPosts, {
        userId: session.user.id,
        integrationId,
        prompt: ""
      })

      // Create streaming response with tools
      const result = await streamText({
        model: openai(config.model),
        system: `${systemPrompt}

You are an AI assistant specialized in social media content creation. You can help users create posts and provide content suggestions.

When users ask you to create or generate a post, use the createPost tool to actually create it in their account.

Always be helpful, creative, and aligned with the user's brand voice and style.`,
        messages,
        maxTokens: config.maxContextWindow,
        temperature: 0.7,
        tools: {
          createPost: tool({
            description: "Create a new social media post with the generated content",
            parameters: z.object({
              content: z.string().describe("The content of the post"),
              scheduledFor: z.string().optional().describe("ISO date string for when to schedule the post (optional)")
            }),
            execute: async ({ content, scheduledFor }) => {
              try {
                if (!currentIntegration) {
                  throw new Error("Integration not found")
                }

                const post = await createPost({
                  data: {
                    content,
                    integrationId,
                    scheduledAt: scheduledFor ? new Date(scheduledFor) : undefined
                  }
                })

                return {
                  success: true,
                  postId: post.id,
                  message: `Post created successfully for ${currentIntegration.platformAccountName}!`,
                  content
                }
              } catch (error) {
                console.error("Error creating post:", error)
                return {
                  success: false,
                  error: error instanceof Error ? error.message : "Failed to create post"
                }
              }
            }
          })
        }
      })

      // Return streaming response
      return result.toDataStreamResponse()
    } catch (error) {
      console.error("Chat API error:", error)
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }
  }
})
