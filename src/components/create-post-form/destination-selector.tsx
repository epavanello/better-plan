import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, MapPin } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getRecentDestinations, createDestinationFromInput } from "@/functions/posts"
import type { Platform } from "@/database/schema"
import type { PlatformInfo, PostDestination } from "@/lib/server/social-platforms/base-platform"

interface DestinationSelectorProps {
  currentPlatform?: Platform
  platformInfo?: PlatformInfo
  selectedIntegrationId: string | undefined
  selectedDestination: PostDestination | undefined
  customDestination: string
  showCustomDestination: boolean
  onDestinationChange: (destination: PostDestination | undefined) => void
  onCustomDestinationChange: (value: string) => void
  onShowCustomDestinationChange: (show: boolean) => void
}

export function DestinationSelector({
  currentPlatform,
  platformInfo,
  selectedIntegrationId,
  selectedDestination,
  customDestination,
  showCustomDestination,
  onDestinationChange,
  onCustomDestinationChange,
  onShowCustomDestinationChange
}: DestinationSelectorProps) {
  // Query for recent destinations
  const { data: recentDestinations, isLoading: isLoadingDestinations } = useQuery({
    queryKey: ["recent-destinations", currentPlatform],
    queryFn: () => getRecentDestinations({ data: { platform: currentPlatform!, limit: 5 } }),
    enabled: !!currentPlatform && !!platformInfo?.supportsDestinations && !!selectedIntegrationId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  const handleCustomDestination = async () => {
    if (!customDestination.trim() || !selectedIntegrationId || !currentPlatform) return

    try {
      const destination = await createDestinationFromInput({
        data: {
          platform: currentPlatform,
          input: customDestination,
          integrationId: selectedIntegrationId
        }
      })

      onDestinationChange(destination)
      onCustomDestinationChange("")
      onShowCustomDestinationChange(false)
    } catch (error) {
      console.error("Error creating custom destination:", error)
    }
  }

  if (!platformInfo?.supportsDestinations) return null

  return (
    <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        <Label className="font-medium text-sm">{platformInfo.destinationLabel}</Label>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Choose destination:</Label>
          <Select
            value={selectedDestination?.id || ""}
            onValueChange={(value) => {
              if (value) {
                const destination = recentDestinations?.find((d) => d.id === value)
                onDestinationChange(destination)
              } else {
                onDestinationChange(undefined)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={platformInfo.destinationPlaceholder || "Select destination"} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingDestinations ? (
                <SelectItem value="loading" disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading destinations...
                </SelectItem>
              ) : recentDestinations && recentDestinations.length > 0 ? (
                recentDestinations.map((dest) => (
                  <SelectItem key={dest.id} value={dest.id}>
                    {dest.name}
                    {dest.description && <span className="text-muted-foreground text-xs"> - {dest.description}</span>}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No recent destinations
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onShowCustomDestinationChange(!showCustomDestination)}
            className="w-full"
          >
            {showCustomDestination ? "Cancel" : "Add Custom Destination"}
          </Button>

          {showCustomDestination && (
            <div className="flex gap-2">
              <Input
                placeholder={platformInfo.destinationPlaceholder || "Enter destination..."}
                value={customDestination}
                onChange={(e) => onCustomDestinationChange(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleCustomDestination}
                disabled={!customDestination.trim()}
                size="sm"
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}