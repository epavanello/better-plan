import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Header } from "@/components/header"
import { authClient } from "@/lib/auth-client"
import globalsCss from "@/styles/globals.css?url"
import { Providers } from "../providers"

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: "utf-8"
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1"
            },
            {
                title: "BETTER PLAN"
            }
        ],
        links: [
            { rel: "stylesheet", href: globalsCss },
            { rel: "icon", href: "/favicon.ico" },
            { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
            { rel: "manifest", href: "/manifest.webmanifest" }
        ]
    }),
    beforeLoad: async () => {
        const session = await authClient.getSession()
        return { session }
    },
    component: RootComponent
})

function RootComponent() {
    return (
        <RootDocument>
            <Outlet />
        </RootDocument>
    )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta
                    name="viewport"
                    content="initial-scale=1, viewport-fit=cover, width=device-width"
                />
                <meta
                    name="theme-color"
                    media="(prefers-color-scheme: light)"
                    content="oklch(1 0 0)"
                />
                <meta
                    name="theme-color"
                    media="(prefers-color-scheme: dark)"
                    content="oklch(0.145 0 0)"
                />

                <HeadContent />
            </head>

            <body>
                <Providers>
                    <div className="flex min-h-svh flex-col">
                        <Header />

                        {children}
                    </div>
                </Providers>

                <Scripts />
            </body>
        </html>
    )
}
