import { GitHubIcon, XIcon } from "@daveyplate/better-auth-ui"

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto flex h-12 items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Built by{" "}
          <a href="https://x.com/emadev01" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
            EmaDev
          </a>
          .
        </p>
        <div className="flex items-center gap-4">
          <a href="https://x.com/emadev01" target="_blank" rel="noopener noreferrer" aria-label="Emanuele's Twitter profile">
            <XIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </a>
          <a href="https://github.com/epavanello/better-plan" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository">
            <GitHubIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </a>
        </div>
      </div>
    </footer>
  )
}
