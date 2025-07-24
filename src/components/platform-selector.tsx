import { platformIcons } from "@/components/platform-icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { integrations } from "@/database/schema"

type Integration = typeof integrations.$inferSelect

interface PlatformSelectorProps {
  integrations: Integration[]
  selectedIntegrationId?: string
  onSelectionChange: (integrationId: string | undefined) => void
  placeholder?: string
  className?: string
}

export function PlatformSelector({
  integrations,
  selectedIntegrationId,
  onSelectionChange,
  placeholder = "Select a platform",
  className = ""
}: PlatformSelectorProps) {
  return (
    <Select onValueChange={onSelectionChange} value={selectedIntegrationId}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {integrations.length > 0 ? (
          integrations.map((integration) => (
            <SelectItem key={integration.id} value={integration.id}>
              <div className="flex items-center gap-2">
                {platformIcons[integration.platform]}
                <span className="truncate">{integration.platformAccountName}</span>
              </div>
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-platforms" disabled>
            No platforms connected
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
