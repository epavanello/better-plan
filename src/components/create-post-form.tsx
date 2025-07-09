import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { checkAiAccess, generateAiContent } from "@/functions/ai"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CalendarClock, Loader2, Lock, Rocket, Sparkles, X } from "lucide-react"
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
        setContent(result.content)
        setAiPrompt("")
        setShowAiInput(false)
        toast.success("Content generated successfully!")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleGenerateAiContent = () => {
    if (!isAiAvailable) {
      onValidationError(aiUnavailableReason || "AI features are not available")
      return
    }

    if (!selectedIntegrationId) {
      onValidationError("Please select a platform first.")
      return
    }
    if (!aiPrompt.trim()) {
      onValidationError("Please enter a prompt for AI generation.")
      return
    }

    generateContent({
      data: {
        prompt: aiPrompt,
        integrationId: selectedIntegrationId
      }
    })
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
    setScheduledDateTime("")
    setAiPrompt("")
    setShowAiInput(false)
    setIsPublishPopoverOpen(false)
    setIsSchedulePopoverOpen(false)
    onClear()
  }

  // Calculate minimum datetime (current time + 5 minutes)
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
              <Button
                type="button"
                variant="outline"
                disabled={true}
                className="w-full cursor-not-allowed opacity-60"
              >
                <Lock className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                {isCheckingAiAccess
                  ? "Checking AI availability..."
                  : aiUnavailableReason || "AI features unavailable"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {!isCheckingAiAccess && aiUnavailableReason && (
          <p className="text-center text-muted-foreground text-sm">{aiUnavailableReason}</p>
        )}
      </div>
    )
  }

  return (
    <div className="w-full rounded-lg border p-4">
      <h2 className="mb-4 font-semibold text-lg">Create a new post</h2>
      <div className="grid gap-4">
        {/* AI Generation Section - Always visible */}
        <div className="space-y-2">
          {!showAiInput || !isAiAvailable ? (
            renderAiButton()
          ) : (
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
                <Button
                  type="button"
                  onClick={handleGenerateAiContent}
                  disabled={!aiPrompt.trim() || isGenerating}
                  size="sm"
                >
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
          )}
        </div>

        {/* Main Content Textarea */}
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isGenerating}
        />

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
                    Your post will be published immediately to {currentIntegrationName}.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsPublishPopoverOpen(false)}
                    disabled={isPending}
                  >
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
                    Choose when to publish your post to {currentIntegrationName}.
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
                  <Button
                    variant="ghost"
                    onClick={() => setIsSchedulePopoverOpen(false)}
                    disabled={isPending}
                  >
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
