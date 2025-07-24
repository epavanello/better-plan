import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Platform } from "@/database/schema"
import { createDestinationFromInput, getRecentDestinations } from "@/functions/posts"
import type { PlatformInfo, PostDestination } from "@/lib/server/social-platforms/base-platform"
import { useQuery } from "@tanstack/react-query"
import { addMinutes, format, isAfter } from "date-fns"
import { CalendarClock, HelpCircle, Loader2, MapPin, Rocket, X } from "lucide-react"
import { useState } from "react"
import { AiGenerator } from "./ai/ai-generator"

interface CreatePostFormProps {
  selectedIntegrationId: string | undefined
  currentIntegrationName?: string
  currentPlatform?: Platform
  platformInfo?: PlatformInfo
  isPending: boolean
  initialScheduledDate?: Date
  onCreatePost: (data: {
    integrationId: string
    content: string
    scheduledAt?: Date
    destination?: PostDestination
    additionalFields?: Record<string, string>
  }) => void
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
  initialScheduledDate,
  onCreatePost,
  onValidationError
}: CreatePostFormProps) {
  const [content, setContent] = useState("")
  const [scheduledDateTime, setScheduledDateTime] = useState(initialScheduledDate ? format(initialScheduledDate, "yyyy-MM-dd'T'HH:mm") : "")
  const [isScheduleMode, setIsScheduleMode] = useState(!!initialScheduledDate)
  const [selectedDestination, setSelectedDestination] = useState<PostDestination | undefined>(undefined)
  const [customDestination, setCustomDestination] = useState("")
  const [showCustomDestination, setShowCustomDestination] = useState(false)
  const [additionalFields, setAdditionalFields] = useState<Record<string, string>>({})
  const [isAiGenerating, setIsAiGenerating] = useState(false)

  // Query for recent destinations
  const { data: recentDestinations, isLoading: isLoadingDestinations } = useQuery({
    queryKey: ["recent-destinations", currentPlatform],
    queryFn: () => getRecentDestinations({ data: { platform: currentPlatform!, limit: 5 } }),
    enabled: !!currentPlatform && !!platformInfo?.supportsDestinations && !!selectedIntegrationId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  const handleSubmit = () => {
    if (!selectedIntegrationId) {
      onValidationError("Please select a platform.")
      return
    }
    if (!content) {
      onValidationError("Please enter some content.")
      return
    }
    if (platformInfo?.maxCharacterLimit && content.length > platformInfo.maxCharacterLimit) {
      onValidationError(`Content exceeds the ${platformInfo.maxCharacterLimit} character limit for ${platformInfo.displayName}.`)
      return
    }
    if (platformInfo?.destinationRequired && !selectedDestination) {
      onValidationError("Please select a destination.")
      return
    }

    // Validate schedule mode requirements
    if (isScheduleMode) {
      if (!scheduledDateTime) {
        onValidationError("Please select a date and time for scheduling.")
        return
      }
      const scheduledDate = new Date(scheduledDateTime)
      if (!isAfter(scheduledDate, new Date())) {
        onValidationError("Scheduled time must be in the future.")
        return
      }
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
      scheduledAt: isScheduleMode ? new Date(scheduledDateTime) : undefined,
      destination: selectedDestination,
      additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined
    })

    // Reset form after successful submission
    setContent("")
    setScheduledDateTime("")
    setIsScheduleMode(false)
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
    const minTime = addMinutes(now, 5)
    return format(minTime, "yyyy-MM-dd'T'HH:mm")
  }

  const renderAdditionalFields = () => {
    if (!platformInfo?.requiredFields || platformInfo.requiredFields.length === 0) {
      return null
    }

    return (
      <div className="space-y-3">
        {platformInfo.requiredFields.map((field) => (
          <div key={field.key} className="space-y-1">
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
                className="min-h-[60px]"
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
            {field.helpText && <p className="text-gray-600 text-xs dark:text-gray-400">{field.helpText}</p>}
          </div>
        ))}
      </div>
    )
  }

  const canSubmit =
    selectedIntegrationId &&
    content &&
    !isPending &&
    !isAiGenerating &&
    (!platformInfo?.destinationRequired || selectedDestination) &&
    (!isScheduleMode || scheduledDateTime) &&
    (!platformInfo?.maxCharacterLimit || content.length <= platformInfo.maxCharacterLimit)

  const handleTabChange = (value: string) => {
    setIsScheduleMode(value === "schedule")
  }

  return (
    <div className="w-full space-y-4">
      {/* AI Generation Section */}
      <AiGenerator
        selectedIntegrationId={selectedIntegrationId}
        isPostCreationPending={isPending}
        currentContent={content}
        platformInfo={platformInfo}
        onContentGenerated={setContent}
        onValidationError={onValidationError}
        onIsGeneratingChange={setIsAiGenerating}
      />

      {/* Main Content Textarea */}
      <div className="space-y-2">
        <Label htmlFor="content">Post Content</Label>
        <Textarea
          id="content"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isAiGenerating}
          className="min-h-[120px]"
        />
        {platformInfo?.maxCharacterLimit && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {content.length} / {platformInfo.maxCharacterLimit} characters
            </span>
            {content.length > platformInfo.maxCharacterLimit && (
              <span className="font-medium text-red-500">{content.length - platformInfo.maxCharacterLimit} characters over limit</span>
            )}
          </div>
        )}
      </div>

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
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-sm">{selectedDestination.name}</div>
                {selectedDestination.description && (
                  <div className="truncate text-muted-foreground text-xs">{selectedDestination.description}</div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDestination(undefined)}
                className="h-6 w-6 flex-shrink-0 p-0"
              >
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
                        <span className="truncate">{dest.name}</span>
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
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder={platformInfo.destinationPlaceholder || "Enter destination..."}
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleCustomDestination}
                      disabled={!customDestination.trim()}
                      size="sm"
                      className="sm:w-auto"
                    >
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

      {/* Publish Options */}
      <Tabs
        defaultValue={isScheduleMode ? "schedule" : "now"}
        value={isScheduleMode ? "schedule" : "now"}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="now" disabled={isPending || isAiGenerating}>
            <Rocket className="mr-2 h-4 w-4" />
            Post Now
          </TabsTrigger>
          <TabsTrigger value="schedule" disabled={isPending || isAiGenerating}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="now" className="mt-4 space-y-4">
          <div className="text-center text-muted-foreground text-sm">
            Your post will be published immediately to {currentIntegrationName}
          </div>
          <Button onClick={handleSubmit} disabled={!canSubmit || isAiGenerating} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Publish Now
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 space-y-4">
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
            {scheduledDateTime && (
              <p className="text-muted-foreground text-sm">Will be published on {format(new Date(scheduledDateTime), "PPP 'at' p")}</p>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={!canSubmit || isAiGenerating} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <CalendarClock className="mr-2 h-4 w-4" />
                Schedule Post
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
