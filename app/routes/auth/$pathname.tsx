import { AuthCard } from "@daveyplate/better-auth-ui"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/auth/$pathname")({
    component: RouteComponent,
    beforeLoad: async ({ context, location }) => {
        if (context.user && ["/auth/sign-in", "/auth/sign-up"].includes(location.pathname)) {
            throw redirect({ to: "/app" })
        }
    }
})

function RouteComponent() {
    const { pathname } = Route.useParams()

    return (
        <main className="flex grow flex-col items-center justify-center gap-4 p-4">
            <AuthCard pathname={pathname} />
        </main>
    )
}
