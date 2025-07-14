import { useState } from "react"
import type { PostFormState, PopoverState } from "../types"

export function usePostFormState() {
  const [postFormState, setPostFormState] = useState<PostFormState>({
    content: "",
    scheduledDateTime: "",
    selectedDestination: undefined,
    customDestination: "",
    showCustomDestination: false,
    additionalFields: {}
  })

  const [popoverState, setPopoverState] = useState<PopoverState>({
    isPublishPopoverOpen: false,
    isSchedulePopoverOpen: false
  })

  const updatePostFormState = (updates: Partial<PostFormState>) => {
    setPostFormState(prev => ({ ...prev, ...updates }))
  }

  const updatePopoverState = (updates: Partial<PopoverState>) => {
    setPopoverState(prev => ({ ...prev, ...updates }))
  }

  const resetForm = () => {
    setPostFormState({
      content: "",
      scheduledDateTime: "",
      selectedDestination: undefined,
      customDestination: "",
      showCustomDestination: false,
      additionalFields: {}
    })
    setPopoverState({
      isPublishPopoverOpen: false,
      isSchedulePopoverOpen: false
    })
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1)
    return now.toISOString().slice(0, 16)
  }

  const canSubmit = postFormState.content.trim().length > 0

  return {
    postFormState,
    popoverState,
    updatePostFormState,
    updatePopoverState,
    resetForm,
    getMinDateTime,
    canSubmit
  }
}