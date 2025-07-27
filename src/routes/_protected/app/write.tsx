import { type CreatePostData, CreatePostForm } from "@/components/create-post-form"
import { platformIcons } from "@/components/platform-icons"
import { PlatformSelector } from "@/components/platform-selector"
import { PostsList } from "@/components/posts-list"
import { Button } from "@/components/ui/button"
import { getIntegrations } from "@/functions/integrations"
import { getPlatformInfo } from "@/functions/platforms"
import { createPost, deletePost, fetchRecentSocialPosts, getPosts } from "@/functions/posts"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { isValid, parseISO } from "date-fns"
import { Download, List, PenTool } from "lucide-react"
import { useMemo } from "react"
import { toast } from "sonner"
import { z } from "zod"

export const Route = createFileRoute("/_protected/app/write")({
  loader: async () => {
    const integrations = await getIntegrations()
    return { integrations }
  },
  validateSearch: z.object({
    scheduledDate: z.string().optional(),
    integrationId: z.string().optional()
  }),
  component: RouteComponent
})

function RouteComponent() {
  const { integrations } = Route.useLoaderData()
  const { scheduledDate, integrationId: selectedIntegrationId } = Route.useSearch()
  const navigate = useNavigate()

  // Parse the scheduled date from URL parameter
  const initialScheduledDate = useMemo(() => {
    if (!scheduledDate) return undefined
    try {
      const date = parseISO(scheduledDate)
      return isValid(date) ? date : undefined
    } catch {
      return undefined
    }
  }, [scheduledDate])

  const {
    data: posts = [],
    isPending: isPostsPending,
    refetch: refetchPosts
  } = useQuery({
    queryKey: ["posts", selectedIntegrationId],
    queryFn: () => getPosts({ data: { integrationId: selectedIntegrationId } }),
    enabled: !!selectedIntegrationId
  })

  const currentIntegration = useMemo(() => integrations.find((i) => i.id === selectedIntegrationId), [integrations, selectedIntegrationId])

  // Get platform information
  const { data: platformInfo } = useQuery({
    queryKey: ["platform-info", currentIntegration?.platform],
    queryFn: () => (currentIntegration ? getPlatformInfo({ data: currentIntegration.platform }) : undefined),
    enabled: !!currentIntegration?.platform
  })

  const platformSupportsFetching = useMemo(() => {
    return currentIntegration?.supportsFetchingRecentPosts ?? false
  }, [currentIntegration])

  const { mutateAsync: create, isPending } = useMutation({
    mutationFn: createPost,
    onSuccess: (_, { data: { scheduledAt } }) => {
      toast.success(scheduledAt ? "Post scheduled successfully!" : "Post published successfully!")
      refetchPosts()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const { mutate: deleteMutate } = useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      toast.success("Post deleted successfully!")
      refetchPosts()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const { mutate: fetchRecent, isPending: isSyncingPosts } = useMutation({
    mutationFn: fetchRecentSocialPosts,
    onSuccess: (data) => {
      toast.success(data.message)
      refetchPosts()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleFetchRecent = () => {
    if (!selectedIntegrationId) {
      toast.error("Please select a platform to import posts from.")
      return
    }
    fetchRecent({ data: { integrationId: selectedIntegrationId } })
  }

  const handleCreatePost = async (data: CreatePostData) => {
    await create({
      data
    })
  }

  const handleValidationError = (message: string) => {
    toast.error(message)
  }

  // Handle platform selection
  const handlePlatformChange = (integrationId: string | undefined) => {
    navigate({
      to: "/app/write",
      search: {
        scheduledDate,
        integrationId
      },
      replace: true
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-14 z-10 h-24 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-bold text-xl sm:text-2xl">Content Creator</h1>
              <p className="text-muted-foreground text-sm">Create and manage your social media posts</p>
            </div>

            {/* Platform Selector */}
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
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 text-center sm:py-20">
            <div className="mb-6 rounded-full bg-muted p-4">
              <PenTool className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 font-semibold text-xl">Ready to create content?</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Select a platform from the dropdown above to start creating and managing your social media posts.
            </p>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <List className="h-4 w-4" />
              <span>Connect your social media accounts to get started</span>
            </div>
          </div>
        ) : (
          // Responsive layout: single column on mobile, two columns on desktop
          <div className="space-y-6 xl:grid xl:grid-cols-3 xl:gap-6 xl:space-y-0">
            {/* Create Post Section - Takes 2 columns on desktop */}
            <div className="xl:col-span-2">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  <h2 className="font-semibold text-lg">Create New Post</h2>
                </div>
                {currentIntegration && (
                  <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                    {platformIcons[currentIntegration.platform]}
                    <span className="truncate font-medium">{currentIntegration.platformAccountName}</span>
                  </div>
                )}
              </div>

              <CreatePostForm
                selectedIntegrationId={selectedIntegrationId}
                currentIntegrationName={currentIntegration?.platformAccountName}
                currentPlatform={currentIntegration?.platform}
                platformInfo={platformInfo}
                isPending={isPending}
                initialScheduledDate={initialScheduledDate}
                onCreatePost={handleCreatePost}
                onValidationError={handleValidationError}
              />
            </div>

            {/* Posts List Section - Takes 1 column on desktop */}
            <div className="xl:col-span-1">
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    <h2 className="font-semibold text-lg">Your Posts</h2>
                    {posts.length > 0 && <span className="rounded-full bg-muted px-2 py-1 font-medium text-xs">{posts.length}</span>}
                  </div>
                  {platformSupportsFetching && (
                    <Button
                      onClick={handleFetchRecent}
                      disabled={!selectedIntegrationId || isSyncingPosts}
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {isSyncingPosts ? "Syncing..." : "Sync"}
                    </Button>
                  )}
                </div>

                <div className="rounded-lg border bg-card">
                  <PostsList
                    posts={posts}
                    isPending={isPostsPending}
                    onDeletePost={(postId) =>
                      deleteMutate({
                        data: {
                          id: postId
                        }
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
