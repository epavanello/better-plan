import { Button } from "@/components/ui/button"
import { GitHubIcon } from "@daveyplate/better-auth-ui"
import { Link, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: LandingPage
})

function LandingPage() {
  return (
    <section className="container mx-auto grid min-h-[calc(100vh-16rem)] flex-1 place-items-center gap-10 py-16 text-center">
      <div className="space-y-6">
        <h1 className="font-bold text-4xl md:text-6xl">Streamline Your Social Media Workflow</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Connect your accounts, create content, and schedule posts with ease. Better-Plan helps you manage your social presence
          effectively.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg">
          <Link to="/app">Get Started for Free</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href="https://github.com/epavanello/better-plan" target="_blank" rel="noopener noreferrer">
            <GitHubIcon className="mr-2 h-5 w-5" />
            Star on GitHub
          </a>
        </Button>
      </div>
    </section>
  )
}
