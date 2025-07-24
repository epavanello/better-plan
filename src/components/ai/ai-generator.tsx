import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { checkAiAccess, generateAiContent } from "@/functions/ai"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronUp, History, Loader2, Lock, Sparkles, Zap } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export interface AiTuningParameters {
  temperature?: number
  maxTokens?: number
  styleOverride?: string
  toneOverride?: string
  lengthOverride?: string
  useEmojisOverride?: boolean
  useHashtagsOverride?: boolean
  customInstructionsOverride?: string
}

export interface GenerationHistory {
  id: string
  content: string
  prompt: string
  parameters: AiTuningParameters
  timestamp: Date
}

interface AiGeneratorProps {
  selectedIntegrationId: string | undefined
  isPostCreationPending: boolean
  currentContent: string
  platformInfo?: {
    displayName: string
    maxCharacterLimit?: number
  }
  onContentGenerated: (content: string) => void
  onValidationError: (message: string) => void
  onIsGeneratingChange: (isGenerating: boolean) => void
}

export function AiGenerator({
  selectedIntegrationId,
  isPostCreationPending,
  currentContent,
  platformInfo,
  onContentGenerated,
  onValidationError,
  onIsGeneratingChange
}: AiGeneratorProps) {
  const [aiPrompt, setAiPrompt] = useState("")
  const [showAiInput, setShowAiInput] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showGenerationHistory, setShowGenerationHistory] = useState(false)

  // AI tuning parameters
  const [aiParameters, setAiParameters] = useState<AiTuningParameters>({
    temperature: 0.7,
    maxTokens: 150
  })

  // Generation history
  const [generationHistory, setGenerationHistory] = useState<GenerationHistory[]>([])

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
          prompt: aiPrompt,
          parameters: { ...aiParameters },
          timestamp: new Date()
        }
        setGenerationHistory((prev) => [historyEntry, ...prev.slice(0, 9)]) // Keep last 10

        onContentGenerated(result.content)
        toast.success("Content generated successfully!")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onMutate: () => {
      onIsGeneratingChange(true)
    },
    onSettled: () => {
      onIsGeneratingChange(false)
    }
  })

  const handleGenerateAiContent = (iterationInstruction?: string, previousContent?: string) => {
    if (!isAiAvailable) {
      onValidationError(aiUnavailableReason || "AI features are not available")
      return
    }

    if (!selectedIntegrationId) {
      onValidationError("Please select a platform first.")
      return
    }
    if (!aiPrompt.trim() && !iterationInstruction) {
      onValidationError("Please enter a prompt for AI generation.")
      return
    }

    // Add character limit information to the prompt if available
    let enhancedPrompt = iterationInstruction || aiPrompt
    if (platformInfo?.maxCharacterLimit) {
      enhancedPrompt += `\n\nIMPORTANT: Keep the response under ${platformInfo.maxCharacterLimit} characters for ${platformInfo.displayName}.`
    }

    generateContent({
      data: {
        prompt: enhancedPrompt,
        integrationId: selectedIntegrationId,
        temperature: aiParameters.temperature,
        maxTokens: aiParameters.maxTokens,
        styleOverride: aiParameters.styleOverride as "casual" | "formal" | "humorous" | "professional" | "conversational" | undefined,
        toneOverride: aiParameters.toneOverride as
          | "friendly"
          | "professional"
          | "authoritative"
          | "inspirational"
          | "educational"
          | undefined,
        lengthOverride: aiParameters.lengthOverride as "short" | "medium" | "long" | undefined,
        useEmojisOverride: aiParameters.useEmojisOverride,
        useHashtagsOverride: aiParameters.useHashtagsOverride,
        customInstructionsOverride: aiParameters.customInstructionsOverride,
        previousContent,
        iterationInstruction: iterationInstruction || undefined
      }
    })
  }

  const handleQuickAdjustment = (adjustment: string) => {
    const adjustmentPrompts: Record<string, string> = {
      shorter: "Make this shorter and more concise",
      longer: "Expand this with more details and examples",
      formal: "Make this more formal and professional",
      casual: "Make this more casual and conversational",
      humor: "Add some humor and personality to this",
      engaging: "Make this more engaging and attention-grabbing"
    }

    if (currentContent && adjustmentPrompts[adjustment]) {
      let prompt = adjustmentPrompts[adjustment]

      // Add character limit information if available
      if (platformInfo?.maxCharacterLimit) {
        prompt += `\n\nIMPORTANT: Keep the response under ${platformInfo.maxCharacterLimit} characters for ${platformInfo.displayName}.`
      }

      handleGenerateAiContent(prompt, currentContent)
    }
  }

  const handleUseHistoryItem = (historyItem: GenerationHistory) => {
    onContentGenerated(historyItem.content)
    setAiPrompt(historyItem.prompt)
    setAiParameters(historyItem.parameters)
    setShowGenerationHistory(false)
  }

  const isAiAvailable = aiAccess?.canAccess
  const aiUnavailableReason = aiAccess?.reason

  const renderAiButton = () => {
    if (isAiAvailable) {
      return (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAiInput(true)}
          disabled={!selectedIntegrationId || isPostCreationPending || isGenerating}
          className="w-full"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate with AI
        </Button>
      )
    }
    return (
      <div className="space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" disabled className="w-full cursor-not-allowed opacity-60">
                <Lock className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                {isCheckingAiAccess ? "Checking AI availability..." : aiUnavailableReason || "AI features unavailable"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {!isCheckingAiAccess && aiUnavailableReason && <p className="text-center text-muted-foreground text-sm">{aiUnavailableReason}</p>}
      </div>
    )
  }

  const renderAdvancedSettings = () => (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <Label className="font-medium text-sm">AI Tuning Parameters</Label>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
          {showAdvancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {showAdvancedSettings && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="temperature" className="text-sm">
                Creativity ({aiParameters.temperature})
              </Label>
              <input
                id="temperature"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={aiParameters.temperature ?? 0.7}
                onChange={(e) => setAiParameters((prev) => ({ ...prev, temperature: Number(e.target.value) }))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
              />
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="maxTokens" className="text-sm">
                Max Length
              </Label>
              <Input
                id="maxTokens"
                type="number"
                min={50}
                max={500}
                value={aiParameters.maxTokens || 150}
                onChange={(e) => setAiParameters((prev) => ({ ...prev, maxTokens: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-sm">Style Override</Label>
              <Select
                value={aiParameters.styleOverride}
                onValueChange={(value) => setAiParameters((prev) => ({ ...prev, styleOverride: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use profile default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Tone Override</Label>
              <Select
                value={aiParameters.toneOverride}
                onValueChange={(value) => setAiParameters((prev) => ({ ...prev, toneOverride: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use profile default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Length Override</Label>
            <Select
              value={aiParameters.lengthOverride}
              onValueChange={(value) => setAiParameters((prev) => ({ ...prev, lengthOverride: value || undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use profile default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                <SelectItem value="medium">Medium (3-5 sentences)</SelectItem>
                <SelectItem value="long">Long (6+ sentences)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useEmojisOverride"
                checked={aiParameters.useEmojisOverride ?? false}
                onCheckedChange={(checked) =>
                  setAiParameters((prev) => ({ ...prev, useEmojisOverride: checked === true ? true : undefined }))
                }
              />
              <Label htmlFor="useEmojisOverride" className="text-sm">
                Force emojis
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useHashtagsOverride"
                checked={aiParameters.useHashtagsOverride ?? false}
                onCheckedChange={(checked) =>
                  setAiParameters((prev) => ({ ...prev, useHashtagsOverride: checked === true ? true : undefined }))
                }
              />
              <Label htmlFor="useHashtagsOverride" className="text-sm">
                Force hashtags
              </Label>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="customInstructionsOverride" className="text-sm">
              Custom Instructions Override
            </Label>
            <Textarea
              id="customInstructionsOverride"
              placeholder="Override your profile's custom instructions for this generation..."
              value={aiParameters.customInstructionsOverride || ""}
              onChange={(e) => setAiParameters((prev) => ({ ...prev, customInstructionsOverride: e.target.value || undefined }))}
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      {!showAiInput || !isAiAvailable ? (
        renderAiButton()
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">AI Prompt</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="ai-prompt"
                placeholder="e.g., Write a post about the benefits of remote work"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={isGenerating}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Button type="button" onClick={() => handleGenerateAiContent()} disabled={!aiPrompt.trim() || isGenerating} size="sm">
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAiInput(false)
                    setAiPrompt("")
                  }}
                  size="sm"
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced AI Settings */}
          {renderAdvancedSettings()}

          {/* Quick Adjustment Buttons */}
          {currentContent && (
            <div className="space-y-2">
              <Label className="font-medium text-sm">Quick Adjustments</Label>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjustment("shorter")}
                  disabled={isGenerating}
                  className="justify-start"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Shorter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjustment("longer")}
                  disabled={isGenerating}
                  className="justify-start"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Longer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjustment("formal")}
                  disabled={isGenerating}
                  className="justify-start"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Formal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjustment("casual")}
                  disabled={isGenerating}
                  className="justify-start"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Casual
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjustment("humor")}
                  disabled={isGenerating}
                  className="justify-start"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Humor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjustment("engaging")}
                  disabled={isGenerating}
                  className="justify-start"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Engaging
                </Button>
              </div>
            </div>
          )}

          {/* Generation History */}
          {generationHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium text-sm">Generation History</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowGenerationHistory(!showGenerationHistory)}>
                  <History className="mr-1 h-3 w-3" />
                  {showGenerationHistory ? "Hide" : "Show"} History
                </Button>
              </div>

              {showGenerationHistory && (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-2">
                  {generationHistory.map((item) => (
                    <div key={item.id} className="rounded border bg-background p-2">
                      <div className="mb-1 flex items-start justify-between">
                        <span className="text-muted-foreground text-xs">{item.timestamp.toLocaleTimeString()}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUseHistoryItem(item)}
                          className="h-6 px-2 text-xs"
                        >
                          Use
                        </Button>
                      </div>
                      <p className="line-clamp-2 text-sm">{item.content}</p>
                      <p className="mt-1 text-muted-foreground text-xs">Prompt: {item.prompt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
