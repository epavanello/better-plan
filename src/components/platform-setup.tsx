import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Platform } from "@/database/schema/integrations"
import { saveUserAppCredentials } from "@/functions/integrations"
import { getCallbackUrl } from "@/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, ExternalLink, Info } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface PlatformSetupProps {
  platform: Platform
  platformDisplayName: string
  redirectUrl: string | null
  platformInfo?: {
    setupInformation?: {
      description?: string
      guideSteps?: { text: string; details?: string[] }[]
      credentialLabels?: { clientId: string; clientSecret: string }
      developerUrl?: string
      callbackUrlDescription?: string
      showGuideByDefault?: boolean
      validationErrorHelp?: string[]
    }
  }
  onComplete: () => void
  onCancel: () => void
}

function GenericPlatformSetup({
  platform,
  platformDisplayName,
  redirectUrl,
  platformInfo,
  onComplete
}: {
  platform: Platform
  platformDisplayName: string
  redirectUrl: string | null
  platformInfo?: PlatformSetupProps["platformInfo"]
  onComplete: () => void
}) {
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [showGuide, setShowGuide] = useState(platformInfo?.setupInformation?.showGuideByDefault ?? false)

  const {
    mutate: saveCredentials,
    isPending,
    error
  } = useMutation({
    mutationFn: saveUserAppCredentials,
    onSuccess: () => {
      toast.success(`${platformDisplayName} credentials validated and saved successfully!`)
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

  const setupInfo = platformInfo?.setupInformation
  const credentialLabels = setupInfo?.credentialLabels || { clientId: "Client ID", clientSecret: "Client Secret" }
  const redirectUri = getCallbackUrl(platform)

  return (
    <div className="space-y-6">
      {/* Platform description */}
      {setupInfo?.description && (
        <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">{platformDisplayName} App Configuration</h3>
              <p className="mb-3 text-blue-800 text-sm dark:text-blue-200">{setupInfo.description}</p>
              {setupInfo.guideSteps && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGuide(!showGuide)}
                  className="border-blue-200 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                >
                  {showGuide ? "Hide" : "Show"} guide
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Setup guide */}
      {showGuide && setupInfo?.guideSteps && (
        <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50">
          <h4 className="mb-3 font-semibold">
            How to create {platformDisplayName.toLowerCase().startsWith("a") ? "an" : "a"} {platformDisplayName} app:
          </h4>

          <ol className="list-inside list-decimal space-y-3 text-sm">
            {setupInfo.guideSteps.map((step, index) => (
              <li key={index}>
                <span className="font-medium">{step.text}</span>
                {step.details && (
                  <ul className="mt-2 ml-4 list-inside list-disc space-y-1 text-muted-foreground">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex}>{detail}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>

          {/* Redirect URI - always show it separately */}
          <div className="mt-4 rounded bg-muted p-3">
            <p className="mb-1 font-medium text-sm">Redirect URI:</p>
            <code
              className="block cursor-pointer select-all rounded bg-background px-2 py-1 text-xs"
              onClick={() => navigator.clipboard?.writeText(redirectUri)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  navigator.clipboard?.writeText(redirectUri)
                }
              }}
              title="Click to copy"
            >
              {redirectUri}
            </code>
            {setupInfo.callbackUrlDescription && <p className="mt-1 text-muted-foreground text-xs">{setupInfo.callbackUrlDescription}</p>}
          </div>

          {setupInfo.developerUrl && (
            <div className="mt-3">
              <a
                href={setupInfo.developerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
              >
                <ExternalLink className="h-4 w-4" />
                Open {platformDisplayName} Developer Portal
              </a>
            </div>
          )}
        </div>
      )}

      {/* Validation error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-100">Validation Failed</h4>
              <p className="mt-1 text-red-800 text-sm dark:text-red-200">{error.message}</p>
              {setupInfo?.validationErrorHelp && (
                <div className="mt-2 text-red-700 text-xs dark:text-red-300">
                  <p className="font-medium">Please check:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {setupInfo.validationErrorHelp.map((help, index) => (
                      <li key={index}>{help}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credentials form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clientId">{credentialLabels.clientId}</Label>
          <Input
            id="clientId"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={`Enter your ${platformDisplayName} app ${credentialLabels.clientId}`}
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientSecret">{credentialLabels.clientSecret}</Label>
          <Input
            id="clientSecret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={`Enter your ${platformDisplayName} app ${credentialLabels.clientSecret}`}
            required
            disabled={isPending}
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Validating credentials..." : "Save credentials"}
        </Button>
      </form>

      {/* Simple fallback for platforms without setup info */}
      {!setupInfo && (
        <div className="rounded-lg border p-4 text-sm">
          <h4 className="mb-2 font-medium">How to get your {platformDisplayName} credentials:</h4>
          <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
            <li>Go to the {platformDisplayName} developer portal</li>
            <li>Create a new application</li>
            <li>Copy the Client ID and Client Secret</li>
            <li>
              Set the redirect URI to: <code className="rounded bg-muted px-1">{redirectUri}</code>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}

export function PlatformSetup({ platform, platformDisplayName, redirectUrl, platformInfo, onComplete, onCancel }: PlatformSetupProps) {
  return (
    <div className="container mx-auto max-w-2xl flex-1 space-y-8 p-4">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl">Configure {platformDisplayName} App</h1>
        <p className="text-muted-foreground">
          {platformInfo?.setupInformation?.description || `Configure your ${platformDisplayName} app credentials to connect your account.`}
        </p>
      </div>

      <GenericPlatformSetup
        platform={platform}
        platformDisplayName={platformDisplayName}
        redirectUrl={redirectUrl}
        platformInfo={platformInfo}
        onComplete={onComplete}
      />

      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
