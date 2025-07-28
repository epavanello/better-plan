import type { ContentSuggestion } from "@/database/schema"
import { SuggestionCard } from "./suggestion-card"

interface SuggestionsListProps {
  suggestions: ContentSuggestion[]
  selectedSuggestionId?: string | null
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onSelect: (suggestion: ContentSuggestion | null) => void
  onEdit: (id: string, newContent: string) => void
  onSchedule: (id: string) => void
  onPublish: (id: string) => void
}

export function SuggestionsList({
  suggestions,
  selectedSuggestionId,
  onAccept,
  onReject,
  onSelect,
  onEdit,
  onSchedule,
  onPublish
}: SuggestionsListProps) {
  if (suggestions.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No suggestions yet. Generate some to get started!</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-xl">Generated Suggestions</h2>
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          isSelected={selectedSuggestionId === suggestion.id}
          onAccept={onAccept}
          onReject={onReject}
          onSelect={onSelect}
          onEdit={onEdit}
          onSchedule={onSchedule}
          onPublish={onPublish}
        />
      ))}
    </div>
  )
}
