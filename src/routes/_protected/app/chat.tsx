import { platformIcons } from "@/components/platform-icons"
import { PlatformSelector } from "@/components/platform-selector"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Platform } from "@/database/schema"
import { getIntegrations } from "@/functions/integrations"
import { createFileRoute } from "@tanstack/react-router"
import { useChat } from "ai/react"
import { Bot, Copy, Send, Sparkles, ThumbsUp, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface IntegrationWithPlatformInfo {
  id: string
  platform: Platform
  platformAccountId: string
  platformAccountName: string
  expiresAt: Date | null
  userId: string
  createdAt: Date
  updatedAt: Date
  supportsFetchingRecentPosts: boolean
}

export const Route = createFileRoute("/_protected/app/chat")({
  loader: async () => {
    const integrations = await getIntegrations()
    return { integrations }
  },
  component: RouteComponent
})

interface ChatLoaderData {
  integrations: IntegrationWithPlatformInfo[]
}

function RouteComponent() {
  const { integrations } = Route.useLoaderData() as ChatLoaderData
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>(undefined)
  const [previewContent, setPreviewContent] = useState("")
  const [generatedPosts, setGeneratedPosts] = useState<Array<{ id: string; content: string; timestamp: Date }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentIntegration = integrations.find((i) => i.id === selectedIntegrationId)

  // Use Vercel AI's useChat hook for streaming
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    body: {
      integrationId: selectedIntegrationId
    },
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === "createPost" && toolCall.args && typeof toolCall.args === "object" && "content" in toolCall.args) {
        // Add the created post to our preview list
        const content = (toolCall.args as { content: string }).content
        const newPost = {
          id: Date.now().toString(),
          content,
          timestamp: new Date()
        }
        setGeneratedPosts((prev) => [newPost, ...prev])
        setPreviewContent(content)
        toast.success("Post created successfully!")
      }
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Update preview with latest assistant message
  useEffect(() => {
    const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
    if (lastAssistantMessage && !lastAssistantMessage.content.includes("Post created successfully")) {
      setPreviewContent(lastAssistantMessage.content)
    }
  }, [messages])

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIntegrationId) {
      toast.error("Please select a platform first")
      return
    }
    handleSubmit(e)
  }

  const handlePreviewCopy = () => {
    navigator.clipboard.writeText(previewContent)
    toast.success("Copied to clipboard!")
  }

  const handlePreviewLike = () => {
    navigator.clipboard.writeText(previewContent)
    toast.success("Message copied and liked!")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-14 z-10 h-24 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-bold text-xl sm:text-2xl">AI Chat Assistant</h1>
              <p className="text-muted-foreground text-sm">Chat with AI and preview content for your social media posts</p>
            </div>
            <div className="w-full sm:w-64">
              <PlatformSelector
                integrations={integrations}
                selectedIntegrationId={selectedIntegrationId}
                onSelectionChange={setSelectedIntegrationId}
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
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 font-semibold text-xl">Ready to chat with AI?</h2>
            <p className="mb-6 max-w-md text-muted-foreground">Select a platform to start chatting and generating content ideas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Side - Preview & Generated Posts */}
            <div className="flex flex-col gap-6">
              {/* Current Preview */}
              <div className="rounded-lg border bg-card">
                <div className="border-b p-6">
                  <h3 className="flex items-center gap-2 font-semibold text-lg">
                    <Sparkles className="h-5 w-5" />
                    AI Content Preview
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Preview of content being generated for {currentIntegration?.platformAccountName}
                  </p>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {currentIntegration && platformIcons[currentIntegration.platform]}
                      <span className="font-medium">{currentIntegration?.platformAccountName}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handlePreviewCopy} disabled={!previewContent}>
                        <Copy />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handlePreviewLike} disabled={!previewContent}>
                        <ThumbsUp />
                      </Button>
                    </div>
                  </div>
                  <div className="min-h-[120px] rounded-lg border bg-muted/30 p-4">
                    {previewContent ? (
                      <p className="whitespace-pre-wrap">{previewContent}</p>
                    ) : (
                      <p className="text-center text-muted-foreground">Start chatting to see AI-generated content preview here</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Generated Posts History */}
              {generatedPosts.length > 0 && (
                <div className="rounded-lg border bg-card">
                  <div className="border-b p-6">
                    <h3 className="flex items-center gap-2 font-semibold text-lg">
                      <Sparkles className="h-5 w-5" />
                      Generated Posts
                    </h3>
                    <p className="text-muted-foreground text-sm">Posts created during this chat session</p>
                  </div>
                  <div className="max-h-[400px] space-y-4 overflow-y-auto p-6">
                    {generatedPosts.map((post) => (
                      <div key={post.id} className="rounded-lg border bg-muted/30 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {currentIntegration && platformIcons[currentIntegration.platform]}
                            <span className="font-medium text-sm">{currentIntegration?.platformAccountName}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {post.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{post.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Chat */}
            <div className="flex flex-col">
              <div className="flex-1 rounded-lg border bg-card">
                <div className="border-b p-6">
                  <h3 className="flex items-center gap-2 font-semibold text-lg">
                    <Sparkles className="h-5 w-5" />
                    AI Chat
                  </h3>
                  <p className="text-muted-foreground text-sm">Chat with AI to generate content ideas</p>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="min-h-[400px] flex-1 overflow-y-auto pr-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
                          <h3 className="font-semibold text-lg">Start a conversation</h3>
                          <p className="text-muted-foreground text-sm">Ask me to help you create content for your social media posts</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className="flex max-w-[80%] items-start gap-3">
                              {message.role === "assistant" && (
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                                  <Bot className="h-4 w-4 text-primary" />
                                </div>
                              )}
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                              >
                                {message.role === "user" && (
                                  <div className="mb-1 flex items-center gap-2">
                                    <User className="h-3 w-3" />
                                    <span className="text-xs opacity-70">You</span>
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap">{message.content}</p>
                                <p className="mt-1 text-xs opacity-70">
                                  {new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                              </div>
                              {message.role === "user" && (
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="flex max-w-[80%] items-start gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <Bot className="h-4 w-4 animate-pulse text-primary" />
                            </div>
                            <div className="rounded-lg bg-muted px-4 py-2">
                              <div className="flex items-center gap-1">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                                <div
                                  className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                                  style={{ animationDelay: "0.1s" }}
                                />
                                <div
                                  className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                                  style={{ animationDelay: "0.2s" }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                  <form onSubmit={handleChatSubmit} className="mt-4 flex gap-2">
                    <Textarea
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Type your message here... (e.g., 'Create a post about productivity tips')"
                      className="min-h-[60px] flex-1 resize-none"
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleChatSubmit(e)
                        }
                      }}
                    />
                    <Button type="submit" disabled={!input.trim() || !selectedIntegrationId || isLoading}>
                      <Send />
                    </Button>
                  </form>
                  {error && <div className="mt-2 text-destructive text-sm">Error: {error.message}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
