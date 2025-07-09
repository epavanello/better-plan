import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveUserAppCredentials } from "@/functions/integrations"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, ExternalLink, Info } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface XAppSetupProps {
  onComplete: () => void
  redirectUrl: string
}

export function XAppSetup({ onComplete, redirectUrl }: XAppSetupProps) {
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [showGuide, setShowGuide] = useState(false)

  const {
    mutate: saveCredentials,
    isPending,
    error
  } = useMutation({
    mutationFn: saveUserAppCredentials,
    onSuccess: () => {
      toast.success("X credentials validated and saved successfully!")
      onComplete()
    },
    onError: (error) => {
      toast.error(`${error.message}`)
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
        platform: "x",
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
              X (Twitter) App Configuration
            </h3>
            <p className="mb-3 text-blue-800 text-sm dark:text-blue-200">
              To connect your X account, you need to first create a Twitter app and enter your
              credentials here. We'll validate them before saving.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(!showGuide)}
              className="border-blue-200 text-blue-700 dark:border-blue-700 dark:text-blue-300"
            >
              {showGuide ? "Hide" : "Show"} guide
            </Button>
          </div>
        </div>
      </div>

      {showGuide && (
        <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50">
          <h4 className="mb-3 font-semibold">How to create an X (Twitter) app:</h4>
          <ol className="list-inside list-decimal space-y-2 text-sm">
            <li>
              Go to{" "}
              <a
                href="https://developer.twitter.com/en/portal/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
              >
                Twitter Developer Portal
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Create a new project and app</li>
            <li>
              In your app settings, configure:
              <ul className="mt-1 ml-4 list-inside list-disc space-y-1">
                <li>
                  <strong>App permissions:</strong> Read and write
                </li>
                <li>
                  <strong>Type of App:</strong> Web App
                </li>
                <li>
                  <strong>Callback URL:</strong>{" "}
                  <code className="rounded bg-gray-200 px-1 text-xs dark:bg-gray-700">
                    {redirectUrl}
                  </code>
                </li>
              </ul>
            </li>
            <li>
              Copy the <strong>API Key</strong> (Client ID) and <strong>API Secret</strong> (Client
              Secret)
            </li>
            <li>Paste the credentials in the form below</li>
          </ol>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-100">Validation Failed</h4>
              <p className="mt-1 text-red-800 text-sm dark:text-red-200">{error.message}</p>
              <p className="mt-2 text-red-700 text-xs dark:text-red-300">
                Please check your credentials and make sure:
                <br />• The API Key and Secret are correct
                <br />• Your app has "Read and write" permissions
                <br />• The callback URL is properly configured
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="clientId" className="font-medium text-sm">
            API Key (Client ID)
          </label>
          <Input
            id="clientId"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Enter your X app API Key"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="clientSecret" className="font-medium text-sm">
            API Secret (Client Secret)
          </label>
          <Input
            id="clientSecret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="Enter your X app API Secret"
            required
            disabled={isPending}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Validating credentials..." : "Save credentials"}
          </Button>
        </div>
      </form>
    </div>
  )
}
