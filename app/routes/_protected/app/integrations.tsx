import { Button } from "@/components/ui/button"
import { getIntegrations } from "@/functions/integrations"
import { startXAuthorization } from "@/functions/auth/x-start-auth"
import { createFileRoute } from "@tanstack/react-router"
import { PlusCircle } from "lucide-react"
import { Suspense } from "react"
import { useMutation } from "@tanstack/react-query"

export const Route = createFileRoute("/_protected/app/integrations")({
    loader: () => getIntegrations(),
    component: IntegrationsComponent
})

function IntegrationsComponent() {
    const integrations = Route.useLoaderData()

    const { mutate: login, isPending } = useMutation({
        mutationFn: () => startXAuthorization(),
        onSuccess: ({ url }) => {
            window.location.href = url
        },
        onError: (error) => {
            console.error("Failed to start X authorization", error)
            // Handle error, e.g., show a toast message
        }
    })

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="font-bold text-2xl">Integrations</h1>
                <Button onClick={() => login()} disabled={isPending}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {isPending ? "Redirecting..." : "Add X Integration"}
                </Button>
            </div>
            <Suspense fallback={<div>Loading...</div>}>
                <div className="rounded-md border">
                    <div className="divide-y divide-border">
                        {integrations.map((integration) => (
                            <div
                                key={integration.id}
                                className="flex items-center justify-between p-4"
                            >
                                <div>
                                    <p className="font-semibold capitalize">
                                        {integration.platform}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        {integration.platformAccountName}
                                    </p>
                                </div>
                                <Button variant="outline" size="sm">
                                    Manage
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Suspense>
        </div>
    )
}
