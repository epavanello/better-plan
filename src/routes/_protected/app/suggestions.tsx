import { type AiTuningParameters, SuggestionTuningPanel } from "@/components/content-suggestions/suggestion-tuning-panel"
import { SuggestionsGenerator } from "@/components/content-suggestions/suggestions-generator"
import { SuggestionsList } from "@/components/content-suggestions/suggestions-list"
import { PlatformSelector } from "@/components/platform-selector"
import { Button } from "@/components/ui/button"
import type { ContentSuggestion } from "@/database/schema"
import { getIntegrations } from "@/functions/integrations"
import {
  acceptSuggestion,
  generateContentSuggestions,
  getSuggestions,
  publishSuggestion,
  regenerateSuggestion,
  rejectSuggestion,
  scheduleSuggestion,
  updateSuggestionContent
} from "@/functions/suggestions"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Loader2, PenTool, Sparkles } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

export const Route = createFileRoute("/_protected/app/suggestions")({
  loader: async () => {
    const integrations = await getIntegrations()
    return { integrations }
  },
  validateSearch: z.object({
    integrationId: z.string().optional()
  }),
  component: RouteComponent
})

function RouteComponent() {
  const { integrations } = Route.useLoaderData()
  const { integrationId: selectedIntegrationId } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedSuggestion, setSelectedSuggestion] = useState<ContentSuggestion | null>(null)
  const [tuningParameters, setTuningParameters] = useState<AiTuningParameters>({})

  const { data: suggestions = [], refetch: refetchSuggestions } = useQuery({
    queryKey: ["suggestions", selectedIntegrationId],
    queryFn: () =>
      getSuggestions({
        data: { integrationId: selectedIntegrationId! }
      }),
    enabled: !!selectedIntegrationId
  })

  const { mutate: generate, isPending: isGenerating } = useMutation({
    mutationFn: generateContentSuggestions,
    onSuccess: () => {
      toast.success("New suggestions generated!")
      refetchSuggestions()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const { mutate: accept } = useMutation({
    mutationFn: acceptSuggestion,
    onSuccess: () => {
      toast.success("Suggestion accepted!")
      queryClient.invalidateQueries({
        queryKey: ["suggestions", selectedIntegrationId]
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const { mutate: reject } = useMutation({
    mutationFn: rejectSuggestion,
    onSuccess: () => {
      toast.info("Suggestion rejected.")
      queryClient.invalidateQueries({
        queryKey: ["suggestions", selectedIntegrationId]
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const { mutate: updateContent, isPending: isUpdatingContent } = useMutation({
    mutationFn: updateSuggestionContent,
    onSuccess: () => {
      toast.success("Suggestion updated!")
      queryClient.invalidateQueries({
        queryKey: ["suggestions", selectedIntegrationId]
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const { mutate: regenerate, isPending: isRegenerating } = useMutation({
    mutationFn: regenerateSuggestion,
    onSuccess: (updatedSuggestion) => {
      toast.success("Suggestion regenerated!")
      queryClient.setQueryData(["suggestions", selectedIntegrationId], (oldData: ContentSuggestion[] | undefined) => {
        return oldData?.map((s) => (s.id === updatedSuggestion.id ? updatedSuggestion : s))
      })
      // also update the selected suggestion
      const newSuggestion = { ...updatedSuggestion, ai_parameters: JSON.stringify(tuningParameters) }
      setSelectedSuggestion(newSuggestion)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const { mutate: publish, isPending: isPublishing } = useMutation({
    mutationFn: publishSuggestion,
    onSuccess: () => {
      toast.success("Suggestion published successfully!")
      queryClient.invalidateQueries({
        queryKey: ["suggestions", selectedIntegrationId]
      })
      queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const { mutate: schedule, isPending: isScheduling } = useMutation({
    mutationFn: scheduleSuggestion,
    onSuccess: () => {
      toast.success("Suggestion scheduled successfully!")
      queryClient.invalidateQueries({
        queryKey: ["suggestions", selectedIntegrationId]
      })
      queryClient.invalidateQueries({ queryKey: ["calendar"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleSelectSuggestion = (suggestion: ContentSuggestion | null) => {
    setSelectedSuggestion(suggestion)
    if (suggestion) {
      // @ts-expect-error - ai_parameters is a JSON string
      const params = suggestion.ai_parameters ? JSON.parse(suggestion.ai_parameters) : {}
      setTuningParameters(params)
    } else {
      setTuningParameters({})
    }
  }

  const handleGenerate = (basePrompt?: string) => {
    if (!selectedIntegrationId) return
    generate({
      data: {
        integrationId: selectedIntegrationId,
        count: 3,
        basePrompt
      }
    })
  }

  const handlePlatformChange = (integrationId: string | undefined) => {
    navigate({
      to: "/app/suggestions",
      search: {
        integrationId
      },
      replace: true
    })
  }

  const handleRegenerate = () => {
    if (!selectedSuggestion) return
    regenerate({
      data: {
        suggestionId: selectedSuggestion.id,
        tuningParameters
      }
    })
  }

  const handlePublish = (suggestionId: string) => {
    publish({ data: { suggestionId } })
  }

  const handleSchedule = (suggestionId: string) => {
    // For now, we schedule 1 day in the future.
    // A date picker should be implemented later.
    const scheduledAt = new Date()
    scheduledAt.setDate(scheduledAt.getDate() + 1)
    schedule({ data: { suggestionId, scheduledAt } })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-14 z-10 h-24 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-bold text-xl sm:text-2xl">Content Suggestions</h1>
              <p className="text-muted-foreground text-sm">Generate AI-powered content ideas</p>
            </div>
            <div className="w-full sm:w-64">
              <PlatformSelector
                integrations={integrations}
                selectedIntegrationId={selectedIntegrationId}
                onSelectionChange={handlePlatformChange}
                placeholder="Select a platform"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {!selectedIntegrationId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center sm:py-20">
            <div className="mb-6 rounded-full bg-muted p-4">
              <PenTool className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 font-semibold text-xl">Ready to find inspiration?</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Select a platform to generate content suggestions tailored to your audience.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col gap-8 md:col-span-2">
              <SuggestionsGenerator onGenerate={handleGenerate} isGenerating={isGenerating} />
              <SuggestionsList
                suggestions={suggestions}
                selectedSuggestionId={selectedSuggestion?.id}
                onAccept={(id) => accept({ data: { suggestionId: id } })}
                onReject={(id) => reject({ data: { suggestionId: id } })}
                onSelect={handleSelectSuggestion}
                onEdit={(id, content) => updateContent({ data: { suggestionId: id, content } })}
                onSchedule={handleSchedule}
                onPublish={handlePublish}
              />
            </div>
            <div className="md:col-span-1">
              {selectedSuggestion ? (
                <div className="sticky top-28 space-y-4">
                  <h3 className="font-semibold">Tune Suggestion</h3>
                  <SuggestionTuningPanel
                    parameters={tuningParameters}
                    onParametersChange={setTuningParameters}
                    isGenerating={isRegenerating}
                  />
                  <Button className="w-full" onClick={handleRegenerate} disabled={isRegenerating}>
                    {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Regenerate
                  </Button>
                </div>
              ) : (
                <div className="sticky top-28 flex h-64 items-center justify-center rounded-lg border border-dashed">
                  <div className="text-center">
                    <p className="text-muted-foreground">Select a suggestion to tune its parameters</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
