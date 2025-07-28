import { UserButton } from "@daveyplate/better-auth-ui"

import { useSession } from "@/hooks/auth-hooks"
import { Link } from "@tanstack/react-router"
import { ModeToggle } from "./mode-toggle"

export function Header() {
  const session = useSession()
  return (
    <header className="sticky top-0 z-50 border-b bg-background/60 px-4 py-3 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="hidden font-bold md:block">BETTER-PLAN.</span>
          <span className="block font-bold md:hidden">BP.</span>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 border-r pr-4">
            {session.data?.user ? (
              <>
                <Link to="/app/write" className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground">
                  Write
                </Link>
                <Link to="/app/calendar" className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground">
                  Calendar
                </Link>
                <Link to="/app/suggestions" className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground">
                  Suggestions
                </Link>
                <Link to="/app" className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground">
                  Platforms
                </Link>
                <Link to="/app/profile" className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground">
                  Context
                </Link>
              </>
            ) : (
              <Link
                to="/auth/$pathname"
                params={{ pathname: "sign-in" }}
                className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              >
                Login
              </Link>
            )}
          </nav>
          <ModeToggle />
          <UserButton className="text-xs" />
        </div>
      </div>
    </header>
  )
}
