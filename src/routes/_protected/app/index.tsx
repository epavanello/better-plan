import { IntegrationsList } from "@/components/integrations/integrations-list"
import { PlatformSetup } from "@/components/platform-setup"
import type { Platform } from "@/database/schema/integrations"
import { deleteUserAppCredentials, getIntegrations, getUserPlatformStatus } from "@/functions/integrations"
import { getAllPlatformInfo, startPlatformAuthorization } from "@/functions/platforms"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
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

  // Render setup screen if necessary
  if (setupPlatform) {
    const platformInfo = platformsInfo.find((p) => p.name === setupPlatform)
    const setupInfo = platformSetups[setupPlatform]

    if (platformInfo && setupInfo) {
      return (
        <PlatformSetup
          platform={setupPlatform}
          platformDisplayName={platformInfo.displayName}
          redirectUrl={setupInfo.redirectUrl || null}
          platformInfo={platformInfo}
          onComplete={handleSetupComplete}
          onCancel={() => setSetupPlatform(null)}
        />
      )
    }
  }

  return (
    <div className="container mx-auto max-w-4xl flex-1 space-y-8 p-4">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl">Integrations</h1>
        <p className="text-muted-foreground">Connect and manage your accounts to post across different platforms.</p>
      </div>

      <IntegrationsList
        integrations={integrations}
        platformsInfo={platformsInfo}
        platformSetups={platformSetups}
        authorizingPlatform={authorizingPlatform}
        onPlatformConnect={handlePlatformConnect}
        onSetupPlatform={setSetupPlatform}
        onIntegrationRemoved={() => router.invalidate()}
      />
    </div>
  )
}
