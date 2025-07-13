import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Platform } from "@/database/schema/integrations"
import { saveUserAppCredentials } from "@/functions/integrations"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { XAppSetup } from "./x-app-setup"

interface PlatformSetupProps {
  platform: Platform
  platformDisplayName: string
  redirectUrl: string | null
  onComplete: () => void
  onCancel: () => void
}

// Registry of custom setup components for platforms that need special UI
const CUSTOM_SETUP_COMPONENTS: Partial<
  Record<
    Platform,
    React.ComponentType<{
      onComplete: () => void
      redirectUrl: string | null
    }>
  >
> = {
  x: XAppSetup
}

// Generic setup component for platforms that just need client credentials
function GenericPlatformSetup({
  platform,
  platformDisplayName,
  onComplete
}: {
  platform: Platform
  platformDisplayName: string
  onComplete: () => void
}) {
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")

  const { mutate: saveCredentials, isPending } = useMutation({
    mutationFn: saveUserAppCredentials,
    onSuccess: () => {
      toast.success(`${platformDisplayName} credentials saved successfully!`)
      onComplete()
    },
    onError: (error) => {
      toast.error(`Error saving credentials: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    saveCredentials({
      data: {
        platform,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={`Enter your ${platformDisplayName} app Client ID`}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientSecret">Client Secret</Label>
          <Input
            id="clientSecret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={`Enter your ${platformDisplayName} app Client Secret`}
            required
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-4 text-sm">
          <h4 className="mb-2 font-medium">How to get your {platformDisplayName} credentials:</h4>
          <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
            <li>Go to {getPlatformDeveloperUrl(platform)}</li>
            <li>Create a new application</li>
            <li>Copy the Client ID and Client Secret</li>
            <li>
              Set the redirect URI to: <code className="rounded bg-muted px-1">{getRedirectUri(platform)}</code>
            </li>
          </ol>
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Saving..." : `Save ${platformDisplayName} Credentials`}
        </Button>
      </div>
    </form>
  )
}

function getPlatformDeveloperUrl(platform: Platform): string {
  const urls: Record<Platform, string> = {
    x: "https://developer.twitter.com/en/portal/dashboard",
    reddit: "https://www.reddit.com/prefs/apps",
    linkedin: "https://www.linkedin.com/developers/apps",
    facebook: "https://developers.facebook.com/apps",
    instagram: "https://developers.facebook.com/apps",
    youtube: "https://console.developers.google.com/",
    tiktok: "https://developers.tiktok.com/"
  }
  return urls[platform] || "#"
}

function getRedirectUri(platform: Platform): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/integrations/${platform}/callback`
  }
  return `/api/integrations/${platform}/callback`
}

export function PlatformSetup({ platform, platformDisplayName, redirectUrl, onComplete, onCancel }: PlatformSetupProps) {
  // Check if this platform has a custom setup component
  const CustomSetupComponent = CUSTOM_SETUP_COMPONENTS[platform]

  return (
    <div className="container mx-auto max-w-2xl flex-1 space-y-8 p-4">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl">Configure {platformDisplayName} App</h1>
        <p className="text-muted-foreground">Configure your {platformDisplayName} app credentials to connect your account.</p>
      </div>

      {CustomSetupComponent ? (
        <CustomSetupComponent onComplete={onComplete} redirectUrl={redirectUrl} />
      ) : (
        <GenericPlatformSetup platform={platform} platformDisplayName={platformDisplayName} onComplete={onComplete} />
      )}

      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
