import { GitHubIcon, XIcon } from "@daveyplate/better-auth-ui"
import { Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex flex-col items-center gap-2 text-center md:flex-row md:text-left">
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} Better Plan. Built with <Heart className="inline h-4 w-4 text-red-500" /> by{" "}
              <a href="https://x.com/emadev01" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                EmaDev
              </a>
            </p>
            <span className="hidden text-muted-foreground md:inline">•</span>
            <p className="text-muted-foreground text-sm">AI-powered social media management</p>
            <span className="hidden text-muted-foreground md:inline">•</span>
            <p className="text-muted-foreground text-sm">v{APP_VERSION}</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://x.com/emadev01"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Emanuele's Twitter profile"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon className="h-5 w-5" />
            </a>
            <a
              href="https://github.com/epavanello/better-plan"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
