import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ContentSuggestion } from "@/database/schema"
import { cn } from "@/lib/utils"
import { Calendar, Check, Edit, Save, Send, ThumbsDown } from "lucide-react"
import { useEffect, useState } from "react"

interface SuggestionCardProps {
  suggestion: ContentSuggestion
  isSelected: boolean
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onSelect: (suggestion: ContentSuggestion) => void
  onEdit: (id: string, newContent: string) => void
  onSchedule: (id: string) => void
  onPublish: (id: string) => void
}

export function SuggestionCard({
  suggestion,
  isSelected,
  onAccept,
  onReject,
  onSelect,
  onEdit,
  onSchedule,
  onPublish
}: SuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(suggestion.content)

  useEffect(() => {
    setEditedContent(suggestion.content)
  }, [suggestion.content])

  const handleSave = () => {
    if (editedContent !== suggestion.content) {
      onEdit(suggestion.id, editedContent)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedContent(suggestion.content)
    setIsEditing(false)
  }

  const isAccepted = suggestion.status === "accepted"

  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border bg-card p-4 transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isAccepted && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10"
      )}
      onClick={() => onSelect(suggestion)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onSelect(suggestion)
        }
      }}
    >
      <div className="flex items-start justify-between">
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="h-28 flex-1"
            onClick={(e) => e.stopPropagation()} // Prevent card selection when clicking textarea
          />
        ) : (
          <p className="flex-1 text-sm">{suggestion.content}</p>
        )}
        <div className="ml-4 flex flex-col gap-2">
          {!isEditing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSave()
                }}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCancelEdit()
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-medium text-xs capitalize",
              isAccepted ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-muted text-muted-foreground"
            )}
          >
            {suggestion.status}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          {!isAccepted && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onReject(suggestion.id)
                }}
                disabled={isAccepted}
              >
                <ThumbsDown className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onAccept(suggestion.id)
                }}
                disabled={isAccepted}
              >
                <Check className="mr-2 h-4 w-4" />
                Accept
              </Button>
            </>
          )}

          {isAccepted && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onSchedule(suggestion.id)
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onPublish(suggestion.id)
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Publish Now
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
