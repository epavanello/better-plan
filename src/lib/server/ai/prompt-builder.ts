import type { Post, UserContext } from "@/database/schema"
import type { AiGenerationOptions } from "./types"

export class AiPromptBuilder {
  buildSystemPrompt(context: UserContext | null, recentPosts: Post[], overrides: Partial<AiGenerationOptions> = {}): string {
    let systemPrompt = "You are a social media content creator assistant. Your task is to generate engaging, authentic social media posts."

    // Add user context if available, with overrides taking priority
    if (context || Object.keys(overrides).length > 0) {
      systemPrompt += "\n\nUser Profile:"
      if (context?.bio) systemPrompt += `\n- Bio: ${context.bio}`
      if (context?.profession) systemPrompt += `\n- Profession: ${context.profession}`
      if (context?.industry) systemPrompt += `\n- Industry: ${context.industry ?? ""}`
      if (context?.targetAudience) systemPrompt += `\n- Target Audience: ${context.targetAudience}`

      // Use overrides or fall back to context
      const writingStyle = overrides.styleOverride || context?.writingStyle
      const toneOfVoice = overrides.toneOverride || context?.toneOfVoice
      const customInstructions = overrides.customInstructionsOverride || context?.customInstructions
      const postLength = overrides.lengthOverride || context?.defaultPostLength

      if (writingStyle) systemPrompt += `\n- Writing Style: ${writingStyle}`
      if (toneOfVoice) systemPrompt += `\n- Tone of Voice: ${toneOfVoice}`
      if (postLength) {
        const lengthMap = {
          short: "1-2 sentences",
          medium: "3-5 sentences",
          long: "6+ sentences"
        }
        systemPrompt += `\n- Preferred Length: ${lengthMap[postLength as keyof typeof lengthMap] || postLength}`
      }
      if (customInstructions) systemPrompt += `\n- Custom Instructions: ${customInstructions}`
    }

    // Add recent posts for style consistency
    if (recentPosts.length > 0) {
      systemPrompt += "\n\nRecent Posts (for style reference):"
      recentPosts.forEach((post, index) => {
        systemPrompt += `\n${index + 1}. ${post.content}`
      })
      systemPrompt += "\n\nPlease maintain consistency with the writing style and tone shown in these recent posts."
    }

    // Handle iteration requests
    if (overrides.previousContent && overrides.iterationInstruction) {
      systemPrompt += "\n\nIteration Request:"
      systemPrompt += `\nPrevious content: "${overrides.previousContent}"`
      systemPrompt += `\nImprovement instruction: ${overrides.iterationInstruction}`
      systemPrompt += "\nPlease generate an improved version based on the instruction while maintaining the core message and style."
    }

    // Add generation guidelines
    systemPrompt += "\n\nGeneration Guidelines:"
    systemPrompt += "\n- Keep the content authentic and engaging"
    systemPrompt += "\n- Match the user's established voice and style"
    systemPrompt += "\n- Make it appropriate for the target audience"
    systemPrompt += "\n- Focus on value and engagement"

    // Use override values or fall back to context
    const finalUseEmojis = overrides.useEmojisOverride !== undefined ? overrides.useEmojisOverride : context?.useEmojis
    const finalUseHashtags = overrides.useHashtagsOverride !== undefined ? overrides.useHashtagsOverride : context?.useHashtags

    if (finalUseEmojis) {
      systemPrompt += "\n- Use emojis appropriately"
    } else {
      systemPrompt += "\n- Do not use emojis"
    }

    if (finalUseHashtags) {
      systemPrompt += "\n- Include relevant hashtags when appropriate"
    } else {
      systemPrompt += "\n- Do not include hashtags"
    }

    return systemPrompt
  }
}
