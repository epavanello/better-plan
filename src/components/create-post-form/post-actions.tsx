import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarClock, Rocket, X } from "lucide-react"
import type { PostDestination } from "@/lib/server/social-platforms/base-platform"
import type { PopoverState } from "./types"

interface PostActionsProps {
  canSubmit: boolean
  isPending: boolean
  isGenerating: boolean
  currentIntegrationName?: string
  selectedDestination: PostDestination | undefined
  scheduledDateTime: string
  popoverState: PopoverState
  getMinDateTime: () => string
  onPublishNow: () => void
  onSchedulePost: () => void
  onClear: () => void
  onScheduledDateTimeChange: (value: string) => void
  onPopoverStateChange: (updates: Partial<PopoverState>) => void
}

export function PostActions({
  canSubmit,
  isPending,
  isGenerating,
  currentIntegrationName,
  selectedDestination,
  scheduledDateTime,
  popoverState,
  getMinDateTime,
  onPublishNow,
  onSchedulePost,
  onClear,
  onScheduledDateTimeChange,
  onPopoverStateChange
}: PostActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onClear} disabled={isPending || isGenerating}>
        <X />
        Clear
      </Button>
      
      <Popover
        open={popoverState.isPublishPopoverOpen}
        onOpenChange={(open) => onPopoverStateChange({ isPublishPopoverOpen: open })}
      >
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
              <Button
                variant="ghost"
                onClick={() => onPopoverStateChange({ isPublishPopoverOpen: false })}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={onPublishNow} disabled={isPending}>
                {isPending ? "Publishing..." : "Publish Now"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <Popover
        open={popoverState.isSchedulePopoverOpen}
        onOpenChange={(open) => onPopoverStateChange({ isSchedulePopoverOpen: open })}
      >
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
                onChange={(e) => onScheduledDateTimeChange(e.target.value)}
                min={getMinDateTime()}
                disabled={isPending}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => onPopoverStateChange({ isSchedulePopoverOpen: false })}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={onSchedulePost} disabled={isPending || !scheduledDateTime}>
                {isPending ? "Scheduling..." : "Schedule Post"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}