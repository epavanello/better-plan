import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_protected")({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            console.log("Protected route, redirecting to login")
            throw redirect({
                to: "/auth/$pathname",
                params: {
                    pathname: "sign-in"
                }
            })
        }
        console.log("Protected route, user is logged in")
    }
})
