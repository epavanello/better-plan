import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronDown, ChevronUp, HelpCircle, Loader2, Lock, RotateCcw, Sparkles } from "lucide-react"
import type { AiGenerationState } from "./types"

interface AiGenerationPanelProps {
  aiState: AiGenerationState
  updateAiState: (updates: Partial<AiGenerationState>) => void
  updateAiParameters: (updates: Partial<AiGenerationState['aiParameters']>) => void
  handleGenerateAiContent: (
    selectedIntegrationId: string | undefined,
    iterationInstruction?: string,
    previousContent?: string,
    onValidationError?: (message: string) => void,
    onContentGenerated?: (content: string) => void
  ) => void
  toggleAiInput: () => void
  isGenerating: boolean
  isCheckingAiAccess: boolean
  isAiAvailable: boolean
  aiUnavailableReason: string | undefined
  selectedIntegrationId: string | undefined
  content: string
  onValidationError: (message: string) => void
  onContentGenerated: (content: string) => void
}

export function AiGenerationPanel({
  aiState,
  updateAiState,
  updateAiParameters,
  handleGenerateAiContent,
  toggleAiInput,
  isGenerating,
  isCheckingAiAccess,
  isAiAvailable,
  aiUnavailableReason,
  selectedIntegrationId,
  content,
  onValidationError,
  onContentGenerated
}: AiGenerationPanelProps) {
  if (!aiState.showAiInput) return null

  if (!isAiAvailable) {
    return (
      <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 font-medium text-sm">
            <Sparkles className="h-4 w-4" />
            AI Content Generation
          </Label>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" disabled className="w-full cursor-not-allowed opacity-60">
                <Lock className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                {isCheckingAiAccess ? "Checking AI availability..." : aiUnavailableReason || "AI features unavailable"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {!isCheckingAiAccess && aiUnavailableReason && (
          <p className="text-center text-muted-foreground text-sm">{aiUnavailableReason}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 font-medium text-sm">
          <Sparkles className="h-4 w-4" />
          AI Content Generation
        </Label>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateAiState({ showGenerationHistory: !aiState.showGenerationHistory })}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View generation history</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="ai-prompt">What would you like to post about?</Label>
          <Textarea
            id="ai-prompt"
            placeholder="e.g., 'Share tips about productivity' or 'Announce our new product launch'"
            value={aiState.aiPrompt}
            onChange={(e) => updateAiState({ aiPrompt: e.target.value })}
            rows={3}
            disabled={isGenerating}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => handleGenerateAiContent(selectedIntegrationId, undefined, undefined, onValidationError, onContentGenerated)}
            disabled={isGenerating || !aiState.aiPrompt.trim()}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
          {content && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleGenerateAiContent(selectedIntegrationId, "Please iterate on this content and make it better while keeping the same core message", content, onValidationError, onContentGenerated)}
              disabled={isGenerating}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <Label className="font-medium text-sm">AI Tuning Parameters</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateAiState({ showAdvancedSettings: !aiState.showAdvancedSettings })}
            >
              {aiState.showAdvancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {aiState.showAdvancedSettings && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature" className="text-sm">
                    Creativity ({aiState.aiParameters.temperature})
                  </Label>
                  <input
                    id="temperature"
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={aiState.aiParameters.temperature ?? 0.7}
                    onChange={(e) => updateAiParameters({ temperature: Number(e.target.value) })}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                  />
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Conservative</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTokens" className="text-sm">
                    Max Length
                  </Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min={50}
                    max={500}
                    value={aiState.aiParameters.maxTokens || 150}
                    onChange={(e) => updateAiParameters({ maxTokens: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Style Override</Label>
                  <Select
                    value={aiState.aiParameters.styleOverride}
                    onValueChange={(value) => updateAiParameters({ styleOverride: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Use profile default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="humorous">Humorous</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Tone Override</Label>
                  <Select
                    value={aiState.aiParameters.toneOverride}
                    onValueChange={(value) => updateAiParameters({ toneOverride: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Use profile default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="inspirational">Inspirational</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Custom Instructions</Label>
                <Textarea
                  placeholder="Additional instructions for AI generation..."
                  value={aiState.aiParameters.customInstructionsOverride || ""}
                  onChange={(e) => updateAiParameters({ customInstructionsOverride: e.target.value || undefined })}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}