import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import type { AiTuningParameters } from "@/lib/server/ai/types"

export type { AiTuningParameters }

interface SuggestionTuningPanelProps {
  parameters: AiTuningParameters
  onParametersChange: (newParameters: AiTuningParameters) => void
  isGenerating: boolean
  className?: string
}

export function SuggestionTuningPanel({ parameters, onParametersChange, isGenerating, className }: SuggestionTuningPanelProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(true)

  const handleParamChange = <K extends keyof AiTuningParameters>(key: K, value: AiTuningParameters[K]) => {
    onParametersChange({ ...parameters, [key]: value })
  }

  return (
    <div className={cn("space-y-3 rounded-lg border bg-muted/30 p-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="font-medium">AI Tuning Parameters</Label>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
          {showAdvancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {showAdvancedSettings && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="temperature">Creativity ({parameters.temperature})</Label>
              <input
                id="temperature"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={parameters.temperature ?? 0.7}
                onChange={(e) => handleParamChange("temperature", Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
                disabled={isGenerating}
              />
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxTokens">Max Length</Label>
              <Input
                id="maxTokens"
                type="number"
                min={50}
                max={1000}
                value={parameters.maxTokens || ""}
                onChange={(e) => handleParamChange("maxTokens", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Default"
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Style Override</Label>
              <Select
                value={parameters.styleOverride}
                onValueChange={(value) => handleParamChange("styleOverride", value || undefined)}
                disabled={isGenerating}
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

            <div className="space-y-1.5">
              <Label>Tone Override</Label>
              <Select
                value={parameters.toneOverride}
                onValueChange={(value) => handleParamChange("toneOverride", value || undefined)}
                disabled={isGenerating}
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

          <div className="space-y-1.5">
            <Label>Length Override</Label>
            <Select
              value={parameters.lengthOverride}
              onValueChange={(value) => handleParamChange("lengthOverride", value || undefined)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use profile default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                <SelectItem value="medium">Medium (3-5 sentences)</SelectItem>
                <SelectItem value="long">Long (6+ sentences)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useEmojisOverride"
                checked={parameters.useEmojisOverride ?? false}
                onCheckedChange={(checked) => handleParamChange("useEmojisOverride", checked === true ? true : undefined)}
                disabled={isGenerating}
              />
              <Label htmlFor="useEmojisOverride">Force emojis</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useHashtagsOverride"
                checked={parameters.useHashtagsOverride ?? false}
                onCheckedChange={(checked) => handleParamChange("useHashtagsOverride", checked === true ? true : undefined)}
                disabled={isGenerating}
              />
              <Label htmlFor="useHashtagsOverride">Force hashtags</Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customInstructionsOverride">Custom Instructions Override</Label>
            <Textarea
              id="customInstructionsOverride"
              placeholder="Override your profile's custom instructions for this generation..."
              value={parameters.customInstructionsOverride || ""}
              onChange={(e) => handleParamChange("customInstructionsOverride", e.target.value || undefined)}
              rows={3}
              disabled={isGenerating}
            />
          </div>
        </div>
      )}
    </div>
  )
}
