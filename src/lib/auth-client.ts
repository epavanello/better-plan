import { organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { envConfig } from "./env"

export const authClient = createAuthClient({
    plugins: [organizationClient()],
    baseURL: envConfig.APP_URL
})
