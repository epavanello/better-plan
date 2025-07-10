import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { getServerSession } from "@/functions/session"
import { Providers } from "../providers"
import globalsCss from "../styles/globals.css?url"

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
    const serverSession = await getServerSession()
    return {
      session: serverSession?.session,
      user: serverSession?.user
    }
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
        <meta name="viewport" content="initial-scale=1, viewport-fit=cover, width=device-width" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="oklch(1 0 0)" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="oklch(0.145 0 0)" />

        <HeadContent />
        {import.meta.env.VITE_PLAUSIBLE_DOMAIN && import.meta.env.VITE_PLAUSIBLE_SCRIPT_URL && (
          <script defer data-domain={import.meta.env.VITE_PLAUSIBLE_DOMAIN} src={import.meta.env.VITE_PLAUSIBLE_SCRIPT_URL} />
        )}
      </head>

      <body>
        <Providers>
          <div className="flex min-h-svh flex-col">
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </div>
        </Providers>

        <Scripts />
      </body>
    </html>
  )
}
