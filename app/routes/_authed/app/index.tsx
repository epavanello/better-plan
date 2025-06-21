import { Button } from "@/components/ui/button"
import { createFileRoute } from "@tanstack/react-router"
import { Rocket } from "lucide-react"

export const Route = createFileRoute("/_authed/app/")({
    component: RouteComponent
})

function RouteComponent() {
    return (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center">
            <Button id="new-post" variant="outline">
                <Rocket />
                New post
            </Button>
        </div>
    )
}
