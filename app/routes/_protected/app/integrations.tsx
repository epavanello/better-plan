import { Button } from "@/components/ui/button"
import type { platformEnum } from "@/database/schema/integrations"
import { startXAuthorization } from "@/functions/auth/x-start-auth"
import { deleteIntegration, getIntegrations } from "@/functions/integrations"
import { RedditIcon, XIcon } from "@daveyplate/better-auth-ui"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { PlusCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/_protected/app/integrations")({
    loader: () => getIntegrations(),
    component: IntegrationsComponent
})

function IntegrationsComponent() {
    const integrations = Route.useLoaderData()
    const router = useRouter()

    const { mutate: loginOnX, isPending: isLoginPending } = useMutation({
        mutationFn: startXAuthorization,
        onSuccess: ({ url }) => {
            window.location.href = url
        }
    })

    const { mutate: remove, isPending: isRemovePending } = useMutation({
        mutationFn: deleteIntegration,
        onSuccess: () => {
            toast.success("Integration removed successfully.")
            router.invalidate()
        }
    })

    const platforms: Record<
        (typeof platformEnum.enumValues)[number],
        {
            icon: React.ReactNode
            connect?: () => void
            pending?: boolean
        }
    > = {
        x: {
            icon: <XIcon className="h-8 w-8" />,
            connect: () => loginOnX({}),
            pending: isLoginPending
        },
        reddit: {
            icon: <RedditIcon className="h-8 w-8" />
        }
    }

    const connectedPlatforms = integrations.map((i) => i.platform)
    const availablePlatforms = (Object.keys(platforms) as Array<keyof typeof platforms>).filter(
        (p) => !connectedPlatforms.includes(p)
    )

    return (
        <div className="container mx-auto p-4">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="font-bold text-2xl">Integrations</h1>
            </div>

            <div className="mb-8">
                <h2 className="mb-4 font-semibold text-lg">Connected</h2>
                {integrations.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {integrations.map((integration) => (
                            <div
                                key={integration.id}
                                className="flex items-center justify-between rounded-lg border p-4"
                            >
                                <div className="flex items-center gap-4">
                                    {platforms[integration.platform]?.icon}
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

                        return (
                            <div
                                key={platform}
                                className="flex items-center justify-between rounded-lg border p-4"
                            >
                                <div className="flex items-center gap-4">
                                    {platformInfo.icon}
                                    <p className="font-semibold capitalize">{platform}</p>
                                </div>
                                <Button
                                    onClick={() => platformInfo.connect?.()}
                                    disabled={platformInfo.pending || !platformInfo.connect}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    {platformInfo.pending ? "Redirecting..." : "Connect"}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
