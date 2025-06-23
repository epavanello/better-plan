import { platformIcons } from "@/components/platform-icons"
import { Button } from "@/components/ui/button"
import { XAppSetup } from "@/components/x-app-setup"
import type { Platform } from "@/database/schema/integrations"
import { startXAuthorization } from "@/functions/auth/x-start-auth"
import {
    deleteIntegration,
    deleteUserAppCredentials,
    getIntegrations,
    getPlatformRequiresUserCredentials,
    getUserAppCredentials
} from "@/functions/integrations"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { PlusCircle, Settings, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/_protected/app/platforms")({
    loader: () => getIntegrations(),
    component: IntegrationsComponent
})

// Configurazione delle piattaforme che potrebbero richiedere setup
const PLATFORMS_WITH_POTENTIAL_SETUP: Platform[] = ["x"]

// Hook personalizzato per gestire le piattaforme che richiedono setup
function usePlatformSetup(platform: Platform) {
    const { data: requiresSetup } = useQuery({
        queryKey: ["platform-requirements", platform],
        queryFn: () => getPlatformRequiresUserCredentials({ data: platform }),
        enabled: PLATFORMS_WITH_POTENTIAL_SETUP.includes(platform)
    })

    const { data: userCredentials, refetch: refetchCredentials } = useQuery({
        queryKey: ["user-credentials", platform],
        queryFn: () => getUserAppCredentials({ data: platform }),
        enabled: requiresSetup?.requiresUserCredentials
    })

    const { mutate: removeCredentials, isPending: isRemoving } = useMutation({
        mutationFn: deleteUserAppCredentials,
        onSuccess: () => {
            toast.success("User credentials removed successfully.")
            refetchCredentials()
        }
    })

    return {
        requiresSetup: requiresSetup?.requiresUserCredentials || false,
        hasCredentials: !!userCredentials,
        canConnect: !requiresSetup?.requiresUserCredentials || !!userCredentials,
        redirectUrl: requiresSetup?.redirectUrl,
        refetchCredentials,
        removeCredentials,
        isRemovingCredentials: isRemoving
    }
}

function IntegrationsComponent() {
    const integrations = Route.useLoaderData()
    const router = useRouter()
    const [setupPlatform, setSetupPlatform] = useState<Platform | null>(null)

    // Setup hooks per le piattaforme che potrebbero richiedere configurazione
    const xSetup = usePlatformSetup("x")

    const { mutate: loginOnX, isPending: isLoginPending } = useMutation({
        mutationFn: startXAuthorization,
        onSuccess: ({ url }) => {
            window.location.href = url
        },
        onError: (error) => {
            toast.error(`Error starting X authentication: ${error.message}`)
        }
    })

    const { mutate: remove, isPending: isRemovePending } = useMutation({
        mutationFn: deleteIntegration,
        onSuccess: () => {
            toast.success("Integration removed successfully.")
            router.invalidate()
        }
    })

    const handlePlatformConnect = (platform: Platform) => {
        switch (platform) {
            case "x": {
                if (xSetup.requiresSetup && !xSetup.hasCredentials) {
                    setSetupPlatform("x")
                } else {
                    loginOnX({})
                }
                break
            }
            // Aggiungi altri casi qui per future piattaforme
            default:
                toast.error(`Connection for ${platform} not implemented yet`)
        }
    }

    const handleSetupComplete = () => {
        if (setupPlatform) {
            const setup = getSetupForPlatform(setupPlatform)
            setup?.refetchCredentials()
            toast.success(`You can now connect your ${setupPlatform.toUpperCase()} account!`)
        }
        setSetupPlatform(null)
    }

    const getSetupForPlatform = (platform: Platform) => {
        switch (platform) {
            case "x":
                return xSetup
            default:
                return null
        }
    }

    const getPlatformSetupInfo = (platform: Platform) => {
        const setup = getSetupForPlatform(platform)
        return {
            requiresSetup: setup?.requiresSetup || false,
            hasCredentials: setup?.hasCredentials || false,
            canConnect: setup?.canConnect ?? true,
            isRemovingCredentials: setup?.isRemovingCredentials || false,
            removeCredentials: setup?.removeCredentials
        }
    }

    const platforms: Record<
        Platform,
        {
            connect?: () => void
            pending?: boolean
        }
    > = {
        x: {
            connect: () => handlePlatformConnect("x"),
            pending: isLoginPending
        },
        reddit: {},
        instagram: {},
        tiktok: {},
        youtube: {},
        facebook: {},
        linkedin: {}
    }

    const connectedPlatforms = integrations.map((i) => i.platform)
    const availablePlatforms = (Object.keys(platforms) as Array<keyof typeof platforms>).filter(
        (p) => !connectedPlatforms.includes(p)
    )

    // Renderizza la schermata di setup se necessario
    if (setupPlatform && setupPlatform === "x" && xSetup.redirectUrl) {
        return (
            <div className="container mx-auto max-w-2xl flex-1 space-y-8 p-4">
                <div className="space-y-2">
                    <h1 className="font-bold text-2xl">Configure X (Twitter) App</h1>
                    <p className="text-muted-foreground">
                        Configure your X app credentials to connect your account.
                    </p>
                </div>

                <XAppSetup onComplete={handleSetupComplete} redirectUrl={xSetup.redirectUrl} />

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
                <p className="text-muted-foreground">
                    Connect and manage your accounts to post across different platforms.
                </p>
            </div>

            <div className="space-y-8">
                <div>
                    <h2 className="mb-4 font-semibold text-lg">Connected</h2>
                    {integrations.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {integrations.map((integration) => (
                                <div
                                    key={integration.id}
                                    className="flex items-center justify-between rounded-lg border p-4"
                                >
                                    <div className="flex items-center gap-4">
                                        {platformIcons[integration.platform]}
                                        <div>
                                            <p className="font-semibold capitalize">
                                                {integration.platform}
                                            </p>
                                            <p className="text-muted-foreground text-sm">
                                                {integration.platformAccountName}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => remove({ data: integration.id })}
                                        disabled={isRemovePending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No integrations connected yet.</p>
                    )}
                </div>

                <div>
                    <h2 className="mb-4 font-semibold text-lg">Available</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {availablePlatforms.map((platform) => {
                            const platformInfo = platforms[platform]
                            const setupInfo = getPlatformSetupInfo(platform)

                            return (
                                <div
                                    key={platform}
                                    className="flex flex-col gap-4 rounded-lg border p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {platformIcons[platform]}
                                            <p className="font-semibold capitalize">{platform}</p>
                                        </div>
                                        {platformInfo.connect && setupInfo.canConnect ? (
                                            <Button
                                                onClick={() => platformInfo.connect?.()}
                                                disabled={platformInfo.pending}
                                            >
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                {platformInfo.pending
                                                    ? "Redirecting..."
                                                    : "Connect"}
                                            </Button>
                                        ) : setupInfo.requiresSetup && !setupInfo.hasCredentials ? (
                                            <Button
                                                variant="outline"
                                                onClick={() => platformInfo.connect?.()}
                                            >
                                                <Settings className="mr-2 h-4 w-4" />
                                                Setup
                                            </Button>
                                        ) : !platformInfo.connect ? (
                                            <p className="text-muted-foreground">Coming soon!</p>
                                        ) : null}
                                    </div>

                                    {setupInfo.requiresSetup && (
                                        <div className="text-sm">
                                            {setupInfo.hasCredentials ? (
                                                <div className="flex items-center justify-between rounded bg-green-50 px-3 py-2 dark:bg-green-950/20">
                                                    <span className="text-green-700 dark:text-green-300">
                                                        App configured ✓
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setupInfo.removeCredentials?.({
                                                                data: platform
                                                            })
                                                        }
                                                        disabled={setupInfo.isRemovingCredentials}
                                                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
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
