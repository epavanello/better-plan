import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { InsertUserContext } from "@/database/schema"
import { getUserContext, updateUserContext } from "@/functions/ai"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/_protected/app/profile")({
  component: RouteComponent
})

function RouteComponent() {
  const {
    data: userContext,
    isPending: isLoading,
    refetch
  } = useQuery({
    queryKey: ["userContext"],
    queryFn: getUserContext
  })

  const { mutate: updateContext, isPending: isUpdating } = useMutation({
    mutationFn: updateUserContext,
    onSuccess: () => {
      toast.success("Profile updated successfully!")
      refetch()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const [formData, setFormData] = useState<Omit<InsertUserContext, "id" | "createdAt" | "updatedAt" | "userId"> | null>(null)

  // Update form data when userContext changes
  useEffect(() => {
    if (userContext) {
      setFormData({
        bio: userContext.bio,
        profession: userContext.profession,
        industry: userContext.industry,
        targetAudience: userContext.targetAudience,
        writingStyle: userContext.writingStyle,
        toneOfVoice: userContext.toneOfVoice,
        preferredTopics: userContext.preferredTopics,
        defaultPostLength: userContext.defaultPostLength,
        useEmojis: userContext.useEmojis,
        useHashtags: userContext.useHashtags,
        customInstructions: userContext.customInstructions
      })
    }
  }, [userContext])

  const handleInputChange = (field: keyof InsertUserContext, value: string | boolean) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            [field]: value
          }
        : null
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData) {
      updateContext({ data: formData })
    }
  }

  if (isLoading || !formData) {
    return (
      <div className="container mx-auto max-w-2xl flex-1 space-y-8 p-4">
        <div className="space-y-2">
          <h1 className="font-bold text-2xl">AI Profile</h1>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl flex-1 space-y-8 p-4">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl">AI Profile</h1>
        <p className="text-muted-foreground">Configure your AI assistant to generate content that matches your voice and style.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Personal Information</h2>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={formData.bio ?? ""}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profession">Profession</Label>
              <Input
                id="profession"
                placeholder="e.g., Software Engineer"
                value={formData.profession ?? ""}
                onChange={(e) => handleInputChange("profession", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., Technology"
                value={formData.industry ?? ""}
                onChange={(e) => handleInputChange("industry", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              placeholder="e.g., Developers, Entrepreneurs"
              value={formData.targetAudience ?? ""}
              onChange={(e) => handleInputChange("targetAudience", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredTopics">Preferred Topics (comma-separated)</Label>
            <Input
              id="preferredTopics"
              placeholder="e.g., AI, Programming, Startups"
              value={formData.preferredTopics ?? ""}
              onChange={(e) => handleInputChange("preferredTopics", e.target.value)}
            />
          </div>
        </div>

        {/* Writing Style */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Writing Style</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="writingStyle">Writing Style</Label>
              <Select value={formData.writingStyle ?? ""} onValueChange={(value) => handleInputChange("writingStyle", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select writing style" />
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
              <Label htmlFor="toneOfVoice">Tone of Voice</Label>
              <Select value={formData.toneOfVoice ?? ""} onValueChange={(value) => handleInputChange("toneOfVoice", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
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
            <Label htmlFor="defaultPostLength">Default Post Length</Label>
            <Select value={formData.defaultPostLength ?? ""} onValueChange={(value) => handleInputChange("defaultPostLength", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select post length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                <SelectItem value="medium">Medium (3-5 sentences)</SelectItem>
                <SelectItem value="long">Long (6+ sentences)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useEmojis"
                checked={formData.useEmojis ?? false}
                onCheckedChange={(checked) => handleInputChange("useEmojis", checked === true)}
              />
              <Label htmlFor="useEmojis">Use emojis in posts</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useHashtags"
                checked={formData.useHashtags ?? true}
                onCheckedChange={(checked) => handleInputChange("useHashtags", checked === true)}
              />
              <Label htmlFor="useHashtags">Include hashtags in posts</Label>
            </div>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Custom Instructions</h2>

          <div className="space-y-2">
            <Label htmlFor="customInstructions">Additional Instructions</Label>
            <Textarea
              id="customInstructions"
              placeholder="Any specific instructions for the AI to follow when generating content..."
              value={formData.customInstructions ?? ""}
              onChange={(e) => handleInputChange("customInstructions", e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update Profile"}
          </Button>
        </div>
      </form>
    </div>
  )
}
