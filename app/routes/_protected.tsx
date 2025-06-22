import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_protected")({
    beforeLoad: ({ context }) => {
        console.log("before", context)
        if (!context.session.data?.user) {
            throw redirect({
                to: "/auth/$pathname",
                params: {
                    pathname: "/login"
                }
            })
        }
    }
})
