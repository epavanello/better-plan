import type { Platform } from "@/database/schema"
import type { PlatformInfo, PostDestination } from "@/lib/server/social-platforms/base-platform"

export interface CreatePostFormProps {
  selectedIntegrationId: string | undefined
  currentIntegrationName?: string
  currentPlatform?: Platform
  platformInfo?: PlatformInfo
  isPending: boolean
  onCreatePost: (data: {
    integrationId: string
    content: string
    scheduledAt?: Date
    destination?: PostDestination
    additionalFields?: Record<string, string>
  }) => void
  onClear: () => void
  onValidationError: (message: string) => void
}

export interface GenerationHistory {
  id: string
  content: string
  prompt: string
  parameters: AiTuningParameters
  timestamp: Date
}

export interface AiTuningParameters {
  temperature?: number
  maxTokens?: number
  styleOverride?: string
  toneOverride?: string
  lengthOverride?: string
  useEmojisOverride?: boolean
  useHashtagsOverride?: boolean
  customInstructionsOverride?: string
}

export interface PostFormState {
  content: string
  scheduledDateTime: string
  selectedDestination: PostDestination | undefined
  customDestination: string
  showCustomDestination: boolean
  additionalFields: Record<string, string>
}

export interface AiGenerationState {
  aiPrompt: string
  showAiInput: boolean
  showAdvancedSettings: boolean
  showGenerationHistory: boolean
  aiParameters: AiTuningParameters
  generationHistory: GenerationHistory[]
}

export interface PopoverState {
  isPublishPopoverOpen: boolean
  isSchedulePopoverOpen: boolean
}