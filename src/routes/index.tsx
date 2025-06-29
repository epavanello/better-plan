import { Button } from "@/components/ui/button"
import { GitHubIcon, XIcon } from "@daveyplate/better-auth-ui"
import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
    component: LandingPage
})

function LandingPage() {
    return (
        <div className="flex-1">
            <section className="container mx-auto grid min-h-[calc(100vh-16rem)] place-items-center gap-10 py-16 text-center md:min-h-[calc(100vh-10rem)]">
                <div className="space-y-6">
                    <h1 className="font-bold text-4xl md:text-6xl">
                        Streamline Your Social Media Workflow
                    </h1>
                    <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                        Connect your accounts, create content, and schedule posts with ease.
                        Better-Plan helps you manage your social presence effectively.
                    </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                    <Button asChild size="lg">
                        <Link to="/app">Get Started for Free</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <a
                            href="https://github.com/epavanello/better-plan"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <GitHubIcon className="mr-2 h-5 w-5" />
                            Star on GitHub
                        </a>
                    </Button>
                </div>
            </section>

            <footer className="border-t">
                <div className="container mx-auto flex h-20 items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                        Built by{" "}
                        <a
                            href="https://x.com/emadev01"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline"
                        >
                            EmaDev
                        </a>
                        .
                    </p>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://x.com/emadev01"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Emanuele's Twitter profile"
                        >
                            <XIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                        </a>
                        <a
                            href="https://github.com/epavanello/better-plan"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub repository"
                        >
                            <GitHubIcon className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
