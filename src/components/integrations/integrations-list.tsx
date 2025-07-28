import { platformIcons } from "@/components/platform-icons"
import { Button } from "@/components/ui/button"
import type { Platform } from "@/database/schema/integrations"
import { deleteIntegration, deleteUserAppCredentials, type getIntegrations, getUserPlatformStatus } from "@/functions/integrations"
import type { getAllPlatformInfo } from "@/functions/platforms"
import { useMutation, useQuery } from "@tanstack/react-query"
import { PlusCircle, Settings, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface IntegrationsListProps {
  integrations: Awaited<ReturnType<typeof getIntegrations>>
  platformsInfo: Awaited<ReturnType<typeof getAllPlatformInfo>>
  platformSetups: Record<Platform, ReturnType<typeof usePlatformSetup>>
  authorizingPlatform: Platform | null
  onPlatformConnect: (platform: Platform) => void
  onSetupPlatform: (platform: Platform) => void
  onIntegrationRemoved: () => void
}

// Hook for platform setup (moved from main component)
function usePlatformSetup(platform: Platform) {
  const { data: platformStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["platform-status", platform],
    queryFn: () => getUserPlatformStatus({ data: { platform } }),
    enabled: true
  })

  const { mutate: removeCredentials, isPending: isRemoving } = useMutation({
    mutationFn: deleteUserAppCredentials,
    onSuccess: () => {
      toast.success("User credentials removed successfully.")
      refetchStatus()
    }
  })

  return {
    requiresSetup: platformStatus?.requiresSetup || false,
    hasCredentials: platformStatus?.hasCredentials || false,
    canConnect: platformStatus?.canConnect ?? true,
    redirectUrl: platformStatus?.redirectUrl,
    credentialSource: platformStatus?.source,
    refetchStatus,
    removeCredentials,
    isRemovingCredentials: isRemoving
  }
}

export function IntegrationsList({
  integrations,
  platformsInfo,
  platformSetups,
  authorizingPlatform,
  onPlatformConnect,
  onSetupPlatform,
  onIntegrationRemoved
}: IntegrationsListProps) {
  const { mutate: remove, isPending: isRemovePending } = useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => {
      toast.success("Integration removed successfully.")
      onIntegrationRemoved()
    }
  })

  const connectedPlatforms = integrations.map((i) => i.platform)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 font-semibold text-lg">Connected</h2>
        {integrations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => {
              const platformInfo = platformsInfo.find((p) => p.name === integration.platform)
              return (
                <div key={integration.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    {platformIcons[integration.platform]}
                    <div>
                      <p className="font-semibold">{platformInfo?.displayName || integration.platform}</p>
                      <p className="text-muted-foreground text-sm">{integration.platformAccountName}</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => remove({ data: { integrationId: integration.id } })}
                    disabled={isRemovePending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">No integrations connected yet.</p>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-semibold text-lg">Available</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {platformsInfo.map((platformInfo) => {
            const setupInfo = platformSetups[platformInfo.name]
            const isCurrentlyAuthenticating = authorizingPlatform === platformInfo.name

            return (
              <div key={platformInfo.name} className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {platformIcons[platformInfo.name]}
                    <p className="font-semibold">{platformInfo.displayName}</p>
                  </div>

                  {platformInfo.isImplemented ? (
                    setupInfo && platformInfo.requiresSetup && !setupInfo.hasCredentials ? (
                      <Button variant="outline" onClick={() => onSetupPlatform(platformInfo.name)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Setup
                      </Button>
                    ) : (
                      <Button onClick={() => onPlatformConnect(platformInfo.name)} disabled={isCurrentlyAuthenticating}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {isCurrentlyAuthenticating ? "Redirecting..." : "Connect"}
                      </Button>
                    )
                  ) : (
                    <p className="text-muted-foreground">Coming soon!</p>
                  )}
                </div>

                {/* Setup information */}
                {platformInfo.requiresSetup && setupInfo && (
                  <div className="text-sm">
                    {setupInfo.hasCredentials ? (
                      <div className="flex items-center justify-between rounded bg-green-50 px-3 py-2 dark:bg-green-950/20">
                        <span className="text-green-700 dark:text-green-300">
                          {setupInfo.credentialSource === "system" ? "System configured ✓" : "App configured ✓"}
                        </span>
                        {setupInfo.credentialSource === "user" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setupInfo.removeCredentials?.({
                                data: { platform: platformInfo.name }
                              })
                            }
                            disabled={setupInfo.isRemovingCredentials}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="rounded bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                        Requires app configuration
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
