import { organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    plugins: [organizationClient()],
    baseURL: "http://localhost:3000"
})
