import { Button } from "@/components/ui/button"
import { GitHubIcon } from "@daveyplate/better-auth-ui"
import { Link, createFileRoute } from "@tanstack/react-router"
import { BarChart3, Bot, Calendar, CheckCircle, Share2, Shield, Sparkles, Zap } from "lucide-react"

export const Route = createFileRoute("/")({
  component: LandingPage
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="space-y-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium text-sm">AI-Powered Social Media Management</span>
          </div>

          <h1 className="font-bold text-5xl tracking-tight md:text-7xl">
            Streamline Your
            <span className="block text-primary">Social Media</span>
            Workflow
          </h1>

          <p className="mx-auto max-w-3xl text-muted-foreground text-xl leading-relaxed">
            Create, schedule, and publish engaging content across multiple platforms with AI assistance. Better Plan helps you manage your
            social presence effectively and grow your audience.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="px-8 py-6 text-lg">
              <Link to="/app">Get Started for Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8 py-6 text-lg">
              <a href="https://github.com/epavanello/better-plan" target="_blank" rel="noopener noreferrer">
                <GitHubIcon className="mr-2 h-5 w-5" />
                Star on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-bold text-4xl">Everything You Need to Succeed</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-xl">
            Powerful features designed to make social media management effortless and effective
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 transition-all hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-xl">AI-Powered Content</h3>
            <p className="text-muted-foreground">
              Generate engaging posts with AI assistance. Get suggestions based on your style and audience.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 transition-all hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-xl">Smart Scheduling</h3>
            <p className="text-muted-foreground">
              Plan and schedule posts with an intuitive calendar interface. Never miss the perfect timing.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 transition-all hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Share2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-xl">Multi-Platform</h3>
            <p className="text-muted-foreground">Connect and manage multiple social media accounts from one dashboard.</p>
          </div>

          <div className="rounded-lg border bg-card p-6 transition-all hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-xl">Content Analytics</h3>
            <p className="text-muted-foreground">Track your publishing history and maintain context for better AI suggestions.</p>
          </div>

          <div className="rounded-lg border bg-card p-6 transition-all hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-xl">Context-Aware AI</h3>
            <p className="text-muted-foreground">AI learns from your writing style and post history for personalized suggestions.</p>
          </div>

          <div className="rounded-lg border bg-card p-6 transition-all hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-xl">Secure & Private</h3>
            <p className="text-muted-foreground">Self-hosted option available. Your data stays private and under your control.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-bold text-4xl">How It Works</h2>
          <p className="text-muted-foreground text-xl">Get started in minutes with our simple three-step process</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <span className="font-bold text-2xl text-primary-foreground">1</span>
            </div>
            <h3 className="mb-2 font-semibold text-xl">Connect Your Accounts</h3>
            <p className="text-muted-foreground">Link your social media platforms through secure OAuth authentication</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <span className="font-bold text-2xl text-primary-foreground">2</span>
            </div>
            <h3 className="mb-2 font-semibold text-xl">Create & Enhance</h3>
            <p className="text-muted-foreground">Write your content and use AI to improve it with smart suggestions</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <span className="font-bold text-2xl text-primary-foreground">3</span>
            </div>
            <h3 className="mb-2 font-semibold text-xl">Schedule & Publish</h3>
            <p className="text-muted-foreground">Schedule posts for optimal timing or publish immediately across platforms</p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 font-bold text-4xl">Why Choose Better Plan?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Save Hours Every Week</h3>
                  <p className="text-muted-foreground">Automate your social media workflow and focus on what matters most</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">AI That Learns Your Style</h3>
                  <p className="text-muted-foreground">Get personalized content suggestions that match your brand voice</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Multi-Platform Management</h3>
                  <p className="text-muted-foreground">Manage all your social accounts from one powerful dashboard</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">Self-Hosted Option</h3>
                  <p className="text-muted-foreground">Keep your data private with our self-hosted solution</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border bg-gradient-to-br from-primary/20 to-primary/5 p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="h-4 w-5/6 rounded bg-muted" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 rounded bg-primary/20" />
                  <div className="h-8 w-16 rounded bg-muted" />
                  <div className="h-8 w-16 rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-2xl border bg-gradient-to-r from-primary/10 to-primary/5 p-12 text-center">
          <h2 className="mb-4 font-bold text-4xl">Ready to Transform Your Social Media?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground text-xl">
            Join thousands of creators and businesses who trust Better Plan to manage their social media presence
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="px-8 py-6 text-lg">
              <Link to="/app">Start Your Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8 py-6 text-lg">
              <a href="https://github.com/epavanello/better-plan" target="_blank" rel="noopener noreferrer">
                <GitHubIcon className="mr-2 h-5 w-5" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
