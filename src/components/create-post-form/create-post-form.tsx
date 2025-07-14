import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles } from "lucide-react"
import { AiGenerationPanel } from "./ai-generation-panel"
import { DestinationSelector } from "./destination-selector"
import { PostActions } from "./post-actions"
import { usePostFormState } from "./hooks/use-post-form-state"
import { useAiGeneration } from "./hooks/use-ai-generation"
import type { CreatePostFormProps } from "./types"

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
  const {
    postFormState,
    popoverState,
    updatePostFormState,
    updatePopoverState,
    resetForm,
    getMinDateTime,
    canSubmit
  } = usePostFormState()

  const {
    aiState,
    updateAiState,
    updateAiParameters,
    handleGenerateAiContent,
    toggleAiInput,
    isGenerating,
    isCheckingAiAccess,
    isAiAvailable,
    aiUnavailableReason
  } = useAiGeneration()

  const handleClear = () => {
    resetForm()
    onClear()
  }

  const handlePublishNow = () => {
    if (!selectedIntegrationId) return

    onCreatePost({
      integrationId: selectedIntegrationId,
      content: postFormState.content,
      destination: postFormState.selectedDestination,
      additionalFields: postFormState.additionalFields
    })
    updatePopoverState({ isPublishPopoverOpen: false })
  }

  const handleSchedulePost = () => {
    if (!selectedIntegrationId || !postFormState.scheduledDateTime) return

    onCreatePost({
      integrationId: selectedIntegrationId,
      content: postFormState.content,
      scheduledAt: new Date(postFormState.scheduledDateTime),
      destination: postFormState.selectedDestination,
      additionalFields: postFormState.additionalFields
    })
    updatePopoverState({ isSchedulePopoverOpen: false })
  }

  const handleContentGenerated = (content: string) => {
    updatePostFormState({ content })
  }

  const renderAdditionalFields = () => {
    if (!platformInfo?.additionalFields || platformInfo.additionalFields.length === 0) return null

    return (
      <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
        <Label className="font-medium text-sm">Additional Fields</Label>
        <div className="space-y-3">
          {platformInfo.additionalFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key} className="text-sm">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id={field.key}
                placeholder={field.placeholder}
                value={postFormState.additionalFields[field.key] || ""}
                onChange={(e) =>
                  updatePostFormState({
                    additionalFields: {
                      ...postFormState.additionalFields,
                      [field.key]: e.target.value
                    }
                  })
                }
                disabled={isPending}
                required={field.required}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-4">
        {/* Content Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="content">Content</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleAiInput}
              className="text-purple-600 hover:text-purple-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {aiState.showAiInput ? "Hide" : "Use"} AI
            </Button>
          </div>
          <Textarea
            id="content"
            placeholder="What's on your mind?"
            value={postFormState.content}
            onChange={(e) => updatePostFormState({ content: e.target.value })}
            rows={4}
            disabled={isPending || isGenerating}
            className="resize-none"
          />
          {postFormState.content && (
            <p className="text-right text-muted-foreground text-sm">{postFormState.content.length} characters</p>
          )}
        </div>

        {/* AI Generation Panel */}
        <AiGenerationPanel
          aiState={aiState}
          updateAiState={updateAiState}
          updateAiParameters={updateAiParameters}
          handleGenerateAiContent={handleGenerateAiContent}
          toggleAiInput={toggleAiInput}
          isGenerating={isGenerating}
          isCheckingAiAccess={isCheckingAiAccess}
          isAiAvailable={isAiAvailable}
          aiUnavailableReason={aiUnavailableReason}
          selectedIntegrationId={selectedIntegrationId}
          content={postFormState.content}
          onValidationError={onValidationError}
          onContentGenerated={handleContentGenerated}
        />

        {/* Destination Selector */}
        <DestinationSelector
          currentPlatform={currentPlatform}
          platformInfo={platformInfo}
          selectedIntegrationId={selectedIntegrationId}
          selectedDestination={postFormState.selectedDestination}
          customDestination={postFormState.customDestination}
          showCustomDestination={postFormState.showCustomDestination}
          onDestinationChange={(destination) => updatePostFormState({ selectedDestination: destination })}
          onCustomDestinationChange={(value) => updatePostFormState({ customDestination: value })}
          onShowCustomDestinationChange={(show) => updatePostFormState({ showCustomDestination: show })}
        />

        {/* Additional Fields */}
        {renderAdditionalFields()}

        {/* Action Buttons */}
        <PostActions
          canSubmit={canSubmit}
          isPending={isPending}
          isGenerating={isGenerating}
          currentIntegrationName={currentIntegrationName}
          selectedDestination={postFormState.selectedDestination}
          scheduledDateTime={postFormState.scheduledDateTime}
          popoverState={popoverState}
          getMinDateTime={getMinDateTime}
          onPublishNow={handlePublishNow}
          onSchedulePost={handleSchedulePost}
          onClear={handleClear}
          onScheduledDateTimeChange={(value) => updatePostFormState({ scheduledDateTime: value })}
          onPopoverStateChange={updatePopoverState}
        />
      </div>
    </div>
  )
}