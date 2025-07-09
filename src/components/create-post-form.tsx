import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { CalendarClock, Rocket, X } from "lucide-react"
import { useState } from "react"

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

  return (
    <div className="w-full rounded-lg border p-4">
      <h2 className="mb-4 font-semibold text-lg">Create a new post</h2>
      <div className="grid gap-4">
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClear} disabled={isPending}>
            <X />
            Clear
          </Button>
          <Popover open={isPublishPopoverOpen} onOpenChange={setIsPublishPopoverOpen}>
            <PopoverTrigger asChild>
              <Button disabled={!canSubmit}>
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
              <Button variant="outline" disabled={!canSubmit}>
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
