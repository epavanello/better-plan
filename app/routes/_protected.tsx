import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_protected")({
    beforeLoad: ({ context }) => {
        console.log("context", context)
        if (!context.session) {
            throw redirect({
                to: "/auth/$pathname",
                params: {
                    pathname: "/login"
                }
            })
        }
    }
})
