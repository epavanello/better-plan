import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Lightbulb } from "lucide-react"

interface SuggestionsGeneratorProps {
  onGenerate: (prompt?: string) => void
  isGenerating: boolean
}

export function SuggestionsGenerator({ onGenerate, isGenerating }: SuggestionsGeneratorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5" />
        <h2 className="font-semibold text-lg">Generate Suggestions</h2>
      </div>
      <Textarea id="prompt" placeholder="e.g., 'A post about the future of AI in marketing...'" className="min-h-[100px]" />
      <Button
        onClick={() => {
          const prompt = (document.getElementById("prompt") as HTMLTextAreaElement)?.value || undefined
          onGenerate(prompt)
        }}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? "Generating..." : "Suggest Content"}
      </Button>
    </div>
  )
}
