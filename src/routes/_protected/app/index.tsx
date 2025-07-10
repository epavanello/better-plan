import { platformIcons } from "@/components/platform-icons"
import { Button } from "@/components/ui/button"
import { XAppSetup } from "@/components/x-app-setup"
import type { Platform } from "@/database/schema/integrations"
import { deleteIntegration, deleteUserAppCredentials, getIntegrations, getUserPlatformStatus } from "@/functions/integrations"
import { getAllPlatformInfo, startPlatformAuthorization } from "@/functions/platforms"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { PlusCircle, Settings, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/_protected/app/")({
  loader: async () => {
    const [integrations, platformsInfo] = await Promise.all([getIntegrations(), getAllPlatformInfo()])
    return { integrations, platformsInfo }
  },
  component: IntegrationsComponent
})

// Hook generico per gestire il setup di qualsiasi piattaforma
function usePlatformSetup(platform: Platform) {
  const { data: platformStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["platform-status", platform],
    queryFn: () => getUserPlatformStatus({ data: platform }),
    enabled: true // Ora funziona per tutte le piattaforme
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

function IntegrationsComponent() {
  const { integrations, platformsInfo } = Route.useLoaderData()
  const router = useRouter()
  const [setupPlatform, setSetupPlatform] = useState<Platform | null>(null)
  const [authorizingPlatform, setAuthorizingPlatform] = useState<Platform | null>(null)

  // Hook generico per tutte le piattaforme che richiedono setup
  const platformSetups = Object.fromEntries(
    platformsInfo.filter((p) => p.requiresSetup).map((p) => [p.name, usePlatformSetup(p.name)])
  ) as Record<Platform, ReturnType<typeof usePlatformSetup>>

  // Mutation generico per l'autorizzazione di qualsiasi piattaforma
  const { mutate: startAuthorization, isPending: isAuthPending } = useMutation({
    mutationFn: startPlatformAuthorization,
    onSuccess: ({ url }) => {
      window.location.href = url
    },
    onError: (error) => {
      setAuthorizingPlatform(null)
      toast.error(`Error starting authorization: ${error.message}`)
    }
  })

  const { mutate: remove, isPending: isRemovePending } = useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => {
      toast.success("Integration removed successfully.")
      router.invalidate()
    }
  })

  // Handler generico per connettere qualsiasi piattaforma
  const handlePlatformConnect = (platform: Platform) => {
    const platformInfo = platformsInfo.find((p) => p.name === platform)
    const setupInfo = platformSetups[platform]

    if (!platformInfo?.isImplemented) {
      toast.error(`${platformInfo?.displayName || platform} is not yet implemented`)
      return
    }

    if (platformInfo.requiresSetup && setupInfo && !setupInfo.hasCredentials) {
      setSetupPlatform(platform)
    } else {
      setAuthorizingPlatform(platform)
      startAuthorization({ data: platform })
    }
  }

  const handleSetupComplete = () => {
    if (setupPlatform && platformSetups[setupPlatform]) {
      platformSetups[setupPlatform].refetchStatus()
      const platformInfo = platformsInfo.find((p) => p.name === setupPlatform)
      toast.success(`You can now connect your ${platformInfo?.displayName} account!`)
    }
    setSetupPlatform(null)
  }

  const connectedPlatforms = integrations.map((i) => i.platform)

  // Renderizza la schermata di setup se necessario (per ora solo X)
  if (setupPlatform === "x" && platformSetups.x?.redirectUrl) {
    return (
      <div className="container mx-auto max-w-2xl flex-1 space-y-8 p-4">
        <div className="space-y-2">
          <h1 className="font-bold text-2xl">Configure X (Twitter) App</h1>
          <p className="text-muted-foreground">Configure your X app credentials to connect your account.</p>
        </div>

        <XAppSetup onComplete={handleSetupComplete} redirectUrl={platformSetups.x.redirectUrl} />

        <Button variant="outline" onClick={() => setSetupPlatform(null)}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl flex-1 space-y-8 p-4">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl">Integrations</h1>
        <p className="text-muted-foreground">Connect and manage your accounts to post across different platforms.</p>
      </div>

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
                    <Button variant="destructive" size="icon" onClick={() => remove({ data: integration.id })} disabled={isRemovePending}>
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
                        <Button variant="outline" onClick={() => handlePlatformConnect(platformInfo.name)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Setup
                        </Button>
                      ) : (
                        <Button onClick={() => handlePlatformConnect(platformInfo.name)} disabled={isCurrentlyAuthenticating}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          {isCurrentlyAuthenticating ? "Redirecting..." : "Connect"}
                        </Button>
                      )
                    ) : (
                      <p className="text-muted-foreground">Coming soon!</p>
                    )}
                  </div>

                  {/* Informazioni di setup */}
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
                                  data: platformInfo.name
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
    </div>
  )
}
