import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { checkAiAccess, generateAiContent } from "@/functions/ai"
import type { AiGenerationState, GenerationHistory } from "../types"

export function useAiGeneration() {
  const [aiState, setAiState] = useState<AiGenerationState>({
    aiPrompt: "",
    showAiInput: false,
    showAdvancedSettings: false,
    showGenerationHistory: false,
    aiParameters: {
      temperature: 0.7,
      maxTokens: 150
    },
    generationHistory: []
  })

  const updateAiState = (updates: Partial<AiGenerationState>) => {
    setAiState(prev => ({ ...prev, ...updates }))
  }

  const updateAiParameters = (updates: Partial<typeof aiState.aiParameters>) => {
    setAiState(prev => ({
      ...prev,
      aiParameters: { ...prev.aiParameters, ...updates }
    }))
  }

  // Always check AI access (for displaying appropriate messages)
  const { data: aiAccess, isLoading: isCheckingAiAccess } = useQuery({
    queryKey: ["ai-access"],
    queryFn: checkAiAccess,
    retry: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // AI content generation mutation
  const { mutate: generateContent, isPending: isGenerating } = useMutation({
    mutationFn: generateAiContent,
    onSuccess: (result) => {
      if (result.content) {
        // Add to history
        const historyEntry: GenerationHistory = {
          id: Date.now().toString(),
          content: result.content,
          prompt: aiState.aiPrompt,
          parameters: { ...aiState.aiParameters },
          timestamp: new Date()
        }
        setAiState(prev => ({
          ...prev,
          generationHistory: [historyEntry, ...prev.generationHistory.slice(0, 9)] // Keep last 10
        }))

        toast.success("Content generated successfully!")
        return result.content
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleGenerateAiContent = (
    selectedIntegrationId: string | undefined,
    iterationInstruction?: string,
    previousContent?: string,
    onValidationError?: (message: string) => void,
    onContentGenerated?: (content: string) => void
  ) => {
    if (!aiAccess?.canAccess) {
      onValidationError?.(aiAccess?.reason || "AI features are not available")
      return
    }

    if (!selectedIntegrationId) {
      onValidationError?.("Please select a platform first.")
      return
    }

    if (!aiState.aiPrompt.trim() && !iterationInstruction) {
      onValidationError?.("Please enter a prompt for AI generation.")
      return
    }

    generateContent({
      data: {
        prompt: iterationInstruction || aiState.aiPrompt,
        integrationId: selectedIntegrationId,
        temperature: aiState.aiParameters.temperature,
        maxTokens: aiState.aiParameters.maxTokens,
        styleOverride: aiState.aiParameters.styleOverride as "casual" | "formal" | "humorous" | "professional" | "conversational" | undefined,
        toneOverride: aiState.aiParameters.toneOverride as
          | "friendly"
          | "professional"
          | "authoritative"
          | "inspirational"
          | "educational"
          | undefined,
        lengthOverride: aiState.aiParameters.lengthOverride as "short" | "medium" | "long" | undefined,
        useEmojisOverride: aiState.aiParameters.useEmojisOverride,
        useHashtagsOverride: aiState.aiParameters.useHashtagsOverride,
        customInstructionsOverride: aiState.aiParameters.customInstructionsOverride,
        previousContent,
        iterationInstruction
      }
    })
  }

  const toggleAiInput = () => {
    setAiState(prev => ({ ...prev, showAiInput: !prev.showAiInput }))
  }

  const isAiAvailable = aiAccess?.canAccess
  const aiUnavailableReason = aiAccess?.reason

  return {
    aiState,
    updateAiState,
    updateAiParameters,
    handleGenerateAiContent,
    toggleAiInput,
    isGenerating,
    isCheckingAiAccess,
    isAiAvailable,
    aiUnavailableReason
  }
}