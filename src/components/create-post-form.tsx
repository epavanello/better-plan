import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Platform } from "@/database/schema"
import { checkAiAccess, generateAiContent } from "@/functions/ai"
import { createDestinationFromInput, getRecentDestinations } from "@/functions/posts"
import type { PlatformInfo, PostDestination } from "@/lib/server/social-platforms/base-platform"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CalendarClock, ChevronDown, ChevronUp, HelpCircle, Loader2, Lock, MapPin, Rocket, RotateCcw, Sparkles, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface CreatePostFormProps {
  selectedIntegrationId: string | undefined
  currentIntegrationName?: string
  currentPlatform?: Platform
  platformInfo?: PlatformInfo
  isPending: boolean
  onCreatePost: (data: {
    integrationId: string
    content: string
    scheduledAt?: Date
    destination?: PostDestination
    additionalFields?: Record<string, string>
  }) => void
  onClear: () => void
  onValidationError: (message: string) => void
}

interface GenerationHistory {
  id: string
  content: string
  prompt: string
  parameters: AiTuningParameters
  timestamp: Date
}

interface AiTuningParameters {
  temperature?: number
  maxTokens?: number
  styleOverride?: string
  toneOverride?: string
  lengthOverride?: string
  useEmojisOverride?: boolean
  useHashtagsOverride?: boolean
  customInstructionsOverride?: string
}

export function CreatePostForm({
  selectedIntegrationId,
  currentIntegrationName,
  currentPlatform,
  platformInfo,
  isPending,
  onCreatePost,
  onClear,
  onValidationError
}: CreatePostFormProps) {
  const [content, setContent] = useState("")
  const [scheduledDateTime, setScheduledDateTime] = useState("")
  const [isPublishPopoverOpen, setIsPublishPopoverOpen] = useState(false)
  const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [showAiInput, setShowAiInput] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showGenerationHistory, setShowGenerationHistory] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState<PostDestination | undefined>(undefined)
  const [customDestination, setCustomDestination] = useState("")
  const [showCustomDestination, setShowCustomDestination] = useState(false)
  const [additionalFields, setAdditionalFields] = useState<Record<string, string>>({})

  // AI tuning parameters
  const [aiParameters, setAiParameters] = useState<AiTuningParameters>({
    temperature: 0.7,
    maxTokens: 150
  })

  // Generation history
  const [generationHistory, setGenerationHistory] = useState<GenerationHistory[]>([])

  // Query for recent destinations
  const { data: recentDestinations, isLoading: isLoadingDestinations } = useQuery({
    queryKey: ["recent-destinations", currentPlatform],
    queryFn: () => getRecentDestinations({ data: { platform: currentPlatform!, limit: 5 } }),
    enabled: !!currentPlatform && !!platformInfo?.supportsDestinations && !!selectedIntegrationId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

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

        setContent(result.content)
        toast.success("Content generated successfully!")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
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

    generateContent({
      data: {
        prompt: iterationInstruction || aiPrompt,
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

    if (content && adjustmentPrompts[adjustment]) {
      handleGenerateAiContent(adjustmentPrompts[adjustment], content)
    }
  }

  const handleUseHistoryItem = (historyItem: GenerationHistory) => {
    setContent(historyItem.content)
    setAiPrompt(historyItem.prompt)
    setAiParameters(historyItem.parameters)
    setShowGenerationHistory(false)
  }

  const handlePublishNow = () => {
    if (!selectedIntegrationId) {
      onValidationError("Please select a platform.")
      return
    }
    if (!content) {
      onValidationError("Please enter some content.")
      return
    }
    if (platformInfo?.destinationRequired && !selectedDestination) {
      onValidationError("Please select a destination.")
      return
    }

    // Validate required fields
    if (platformInfo?.requiredFields) {
      for (const field of platformInfo.requiredFields) {
        if (field.required && !additionalFields[field.key]) {
          onValidationError(`${field.label} is required.`)
          return
        }
      }
    }

    onCreatePost({
      integrationId: selectedIntegrationId,
      content,
      scheduledAt: undefined,
      destination: selectedDestination,
      additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined
    })
    setIsPublishPopoverOpen(false)
  }

  const handleSchedulePost = () => {
    if (!selectedIntegrationId) {
      onValidationError("Please select a platform.")
      return
    }
    if (!content) {
      onValidationError("Please enter some content.")
      return
    }
    if (platformInfo?.destinationRequired && !selectedDestination) {
      onValidationError("Please select a destination.")
      return
    }
    if (!scheduledDateTime) {
      onValidationError("Please select a date and time for scheduling.")
      return
    }
    const scheduledDate = new Date(scheduledDateTime)
    if (scheduledDate <= new Date()) {
      onValidationError("Scheduled time must be in the future.")
      return
    }

    // Validate required fields
    if (platformInfo?.requiredFields) {
      for (const field of platformInfo.requiredFields) {
        if (field.required && !additionalFields[field.key]) {
          onValidationError(`${field.label} is required.`)
          return
        }
      }
    }

    onCreatePost({
      integrationId: selectedIntegrationId,
      content,
      scheduledAt: scheduledDate,
      destination: selectedDestination,
      additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined
    })
    setIsSchedulePopoverOpen(false)
  }

  const handleClear = () => {
    setContent("")
    setAiPrompt("")
    setScheduledDateTime("")
    setSelectedDestination(undefined)
    setCustomDestination("")
    setShowCustomDestination(false)
    setAdditionalFields({})
    onClear()
  }

  const handleCustomDestination = () => {
    if (!customDestination.trim()) {
      onValidationError("Please enter a destination.")
      return
    }
    if (!currentPlatform) {
      onValidationError("Please select a platform first.")
      return
    }
    if (!selectedIntegrationId) {
      onValidationError("Please select an integration first.")
      return
    }

    // Use the backend function to create destination with platform-specific logic
    createDestinationFromInput({
      data: {
        platform: currentPlatform,
        input: customDestination,
        integrationId: selectedIntegrationId
      }
    })
      .then((destination) => {
        setSelectedDestination(destination)
        setShowCustomDestination(false)
        setCustomDestination("")
      })
      .catch((error) => {
        onValidationError(error.message || "Failed to create destination")
      })
  }

  const handleDestinationSelect = (destination: PostDestination) => {
    setSelectedDestination(destination)
    setShowCustomDestination(false)
    setCustomDestination("")
  }

  const handleAdditionalFieldChange = (key: string, value: string) => {
    setAdditionalFields((prev) => ({ ...prev, [key]: value }))
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toISOString().slice(0, 16)
  }

  const renderAdditionalFields = () => {
    if (!platformInfo?.requiredFields || platformInfo.requiredFields.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        {platformInfo.requiredFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key} className="font-medium text-sm">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            {field.type === "textarea" ? (
              <Textarea
                id={field.key}
                value={additionalFields[field.key] || ""}
                onChange={(e) => handleAdditionalFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                className="min-h-[80px]"
              />
            ) : field.type === "select" && field.options ? (
              <Select value={additionalFields[field.key] || ""} onValueChange={(value) => handleAdditionalFieldChange(field.key, value)}>
                <SelectTrigger>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={field.key}
                type={field.type === "number" ? "number" : "text"}
                value={additionalFields[field.key] || ""}
                onChange={(e) => handleAdditionalFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
              />
            )}
            {field.helpText && <p className="text-gray-600 text-sm dark:text-gray-400">{field.helpText}</p>}
          </div>
        ))}
      </div>
    )
  }

  const canSubmit = selectedIntegrationId && content && !isPending && (!platformInfo?.destinationRequired || selectedDestination)
  const isAiAvailable = aiAccess?.canAccess
  const aiUnavailableReason = aiAccess?.reason

  const renderAiButton = () => {
    if (isAiAvailable) {
      // AI is available - show normal button
      return (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAiInput(true)}
          disabled={!selectedIntegrationId || isPending || isGenerating}
          className="w-full"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate with AI
        </Button>
      )
    }
    // AI is not available - show disabled button with tooltip and description
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
    <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center justify-between">
        <Label className="font-medium text-sm">AI Tuning Parameters</Label>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
          {showAdvancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {showAdvancedSettings && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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

            <div className="space-y-2">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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

            <div className="space-y-2">
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

          <div className="space-y-2">
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

          <div className="flex gap-4">
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

          <div className="space-y-2">
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
    <div className="w-full rounded-lg border p-4">
      <h2 className="mb-4 font-semibold text-lg">Create a new post</h2>
      <div className="grid gap-4">
        {/* AI Generation Section - Always visible */}
        <div className="space-y-2">
          {!showAiInput || !isAiAvailable ? (
            renderAiButton()
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">AI Prompt</Label>
                <div className="flex gap-2">
                  <Input
                    id="ai-prompt"
                    placeholder="e.g., Write a post about the benefits of remote work"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={isGenerating}
                  />
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

              {/* Advanced AI Settings */}
              {renderAdvancedSettings()}

              {/* Quick Adjustment Buttons - only show if content exists */}
              {
                <div className="space-y-2">
                  <Label className="font-medium text-sm">Quick Adjustments</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdjustment("shorter")}
                      disabled={isGenerating}
                    >
                      <RotateCcw />
                      Shorter
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdjustment("longer")}
                      disabled={isGenerating}
                    >
                      <RotateCcw />
                      Longer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdjustment("formal")}
                      disabled={isGenerating}
                    >
                      <RotateCcw />
                      More Formal
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdjustment("casual")}
                      disabled={isGenerating}
                    >
                      <RotateCcw />
                      More Casual
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdjustment("humor")}
                      disabled={isGenerating}
                    >
                      <RotateCcw />
                      Add Humor
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdjustment("engaging")}
                      disabled={isGenerating}
                    >
                      <RotateCcw />
                      More Engaging
                    </Button>
                  </div>
                </div>
              }

              {/* Generation History */}
              {generationHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium text-sm">Generation History</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowGenerationHistory(!showGenerationHistory)}>
                      {showGenerationHistory ? "Hide" : "Show"} History
                    </Button>
                  </div>

                  {showGenerationHistory && (
                    <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-2">
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

        {/* Main Content Textarea */}
        <Textarea placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} disabled={isGenerating} />

        {/* Destination Selection - Only show if platform supports destinations */}
        {platformInfo?.supportsDestinations && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <Label className="font-medium text-sm">
                Destination
                {platformInfo.destinationRequired && <span className="ml-1 text-red-500">*</span>}
              </Label>
              {platformInfo.destinationHelpText && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{platformInfo.destinationHelpText}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Selected Destination Display */}
            {selectedDestination && (
              <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{selectedDestination.name}</div>
                  {selectedDestination.description && (
                    <div className="text-muted-foreground text-xs">{selectedDestination.description}</div>
                  )}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDestination(undefined)} className="h-6 w-6 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Destination Selection */}
            {!selectedDestination && (
              <div className="space-y-2">
                {/* Recent Destinations */}
                {recentDestinations && recentDestinations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Recent Destinations</Label>
                    <div className="flex flex-wrap gap-2">
                      {recentDestinations.map((dest) => (
                        <Button
                          key={dest.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDestinationSelect(dest)}
                          className="h-8 text-xs"
                        >
                          <MapPin className="mr-1 h-3 w-3" />
                          {dest.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Destination Input */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomDestination(!showCustomDestination)}
                    className="w-full"
                  >
                    {showCustomDestination ? "Cancel" : "Add Custom Destination"}
                  </Button>

                  {showCustomDestination && (
                    <div className="flex gap-2">
                      <Input
                        placeholder={platformInfo.destinationPlaceholder || "Enter destination..."}
                        value={customDestination}
                        onChange={(e) => setCustomDestination(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" onClick={handleCustomDestination} disabled={!customDestination.trim()} size="sm">
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Fields */}
        {renderAdditionalFields()}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClear} disabled={isPending || isGenerating}>
            <X />
            Clear
          </Button>
          <Popover open={isPublishPopoverOpen} onOpenChange={setIsPublishPopoverOpen}>
            <PopoverTrigger asChild>
              <Button disabled={!canSubmit || isGenerating}>
                <Rocket />
                Post Now
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" side="bottom">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Publish Post</h3>
                  <p className="text-muted-foreground text-sm">
                    Your post will be published immediately to {currentIntegrationName}
                    {selectedDestination && (
                      <span className="mt-1 block">
                        <strong>Destination:</strong> {selectedDestination.name}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsPublishPopoverOpen(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button onClick={handlePublishNow} disabled={isPending}>
                    {isPending ? "Publishing..." : "Publish Now"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={isSchedulePopoverOpen} onOpenChange={setIsSchedulePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={!canSubmit || isGenerating}>
                <CalendarClock />
                Schedule
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">Schedule Post</h3>
                  <p className="text-muted-foreground text-sm">
                    Choose when to publish your post to {currentIntegrationName}
                    {selectedDestination && (
                      <span className="mt-1 block">
                        <strong>Destination:</strong> {selectedDestination.name}
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-time">Schedule for:</Label>
                  <Input
                    id="schedule-time"
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    min={getMinDateTime()}
                    disabled={isPending}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setIsSchedulePopoverOpen(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button onClick={handleSchedulePost} disabled={isPending || !scheduledDateTime}>
                    {isPending ? "Scheduling..." : "Schedule Post"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
