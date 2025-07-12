import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { checkAiAccess, generateAiContent } from "@/functions/ai"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CalendarClock, Loader2, Lock, Rocket, Sparkles, X, RotateCcw, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface CreatePostFormProps {
  selectedIntegrationId: string | undefined
  currentIntegrationName?: string
  isPending: boolean
  onCreatePost: (data: {
    integrationId: string
    content: string
    scheduledAt?: Date
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
  
  // AI tuning parameters
  const [aiParameters, setAiParameters] = useState<AiTuningParameters>({
    temperature: 0.7,
    maxTokens: 150,
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
        setGenerationHistory(prev => [historyEntry, ...prev.slice(0, 9)]) // Keep last 10

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
        toneOverride: aiParameters.toneOverride as "friendly" | "professional" | "authoritative" | "inspirational" | "educational" | undefined,
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

    onCreatePost({
      integrationId: selectedIntegrationId,
      content,
      scheduledAt: undefined
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
    if (!scheduledDateTime) {
      onValidationError("Please select a date and time for scheduling.")
      return
    }
    const scheduledDate = new Date(scheduledDateTime)
    if (scheduledDate <= new Date()) {
      onValidationError("Scheduled time must be in the future.")
      return
    }

    onCreatePost({
      integrationId: selectedIntegrationId,
      content,
      scheduledAt: scheduledDate
    })
    setIsSchedulePopoverOpen(false)
  }

  const handleClear = () => {
    setContent("")
    setAiPrompt("")
    setScheduledDateTime("")
    onClear()
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toISOString().slice(0, 16)
  }

  const canSubmit = selectedIntegrationId && content && !isPending
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
    <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">AI Tuning Parameters</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        >
          {showAdvancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {showAdvancedSettings && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-sm">Creativity ({aiParameters.temperature})</Label>
              <input
                id="temperature"
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={aiParameters.temperature || 0.7}
                onChange={(e) => setAiParameters(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxTokens" className="text-sm">Max Length</Label>
              <Input
                id="maxTokens"
                type="number"
                min={50}
                max={500}
                value={aiParameters.maxTokens || 150}
                onChange={(e) => setAiParameters(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Style Override</Label>
              <Select value={aiParameters.styleOverride || ""} onValueChange={(value) => setAiParameters(prev => ({ ...prev, styleOverride: value || undefined }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Use profile default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Use profile default</SelectItem>
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
              <Select value={aiParameters.toneOverride || ""} onValueChange={(value) => setAiParameters(prev => ({ ...prev, toneOverride: value || undefined }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Use profile default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Use profile default</SelectItem>
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
            <Select value={aiParameters.lengthOverride || ""} onValueChange={(value) => setAiParameters(prev => ({ ...prev, lengthOverride: value || undefined }))}>
              <SelectTrigger>
                <SelectValue placeholder="Use profile default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Use profile default</SelectItem>
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
                onCheckedChange={(checked) => setAiParameters(prev => ({ ...prev, useEmojisOverride: checked === true ? true : undefined }))}
              />
              <Label htmlFor="useEmojisOverride" className="text-sm">Force emojis</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useHashtagsOverride"
                checked={aiParameters.useHashtagsOverride ?? false}
                onCheckedChange={(checked) => setAiParameters(prev => ({ ...prev, useHashtagsOverride: checked === true ? true : undefined }))}
              />
              <Label htmlFor="useHashtagsOverride" className="text-sm">Force hashtags</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customInstructionsOverride" className="text-sm">Custom Instructions Override</Label>
            <Textarea
              id="customInstructionsOverride"
              placeholder="Override your profile's custom instructions for this generation..."
              value={aiParameters.customInstructionsOverride || ""}
              onChange={(e) => setAiParameters(prev => ({ ...prev, customInstructionsOverride: e.target.value || undefined }))}
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
              {content && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Adjustments</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleQuickAdjustment('shorter')} disabled={isGenerating}>
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Shorter
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleQuickAdjustment('longer')} disabled={isGenerating}>
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Longer
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleQuickAdjustment('formal')} disabled={isGenerating}>
                      <RotateCcw className="mr-1 h-3 w-3" />
                      More Formal
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleQuickAdjustment('casual')} disabled={isGenerating}>
                      <RotateCcw className="mr-1 h-3 w-3" />
                      More Casual
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleQuickAdjustment('humor')} disabled={isGenerating}>
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Add Humor
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleQuickAdjustment('engaging')} disabled={isGenerating}>
                      <RotateCcw className="mr-1 h-3 w-3" />
                      More Engaging
                    </Button>
                  </div>
                </div>
              )}

              {/* Generation History */}
              {generationHistory.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Generation History</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGenerationHistory(!showGenerationHistory)}
                    >
                      {showGenerationHistory ? 'Hide' : 'Show'} History
                    </Button>
                  </div>
                  
                  {showGenerationHistory && (
                    <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2 bg-muted/30">
                      {generationHistory.map((item) => (
                        <div key={item.id} className="border rounded p-2 bg-background">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-muted-foreground">
                              {item.timestamp.toLocaleTimeString()}
                            </span>
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
                          <p className="text-sm line-clamp-2">{item.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">Prompt: {item.prompt}</p>
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
                  <p className="text-muted-foreground text-sm">Your post will be published immediately to {currentIntegrationName}.</p>
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
                  <p className="text-muted-foreground text-sm">Choose when to publish your post to {currentIntegrationName}.</p>
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
