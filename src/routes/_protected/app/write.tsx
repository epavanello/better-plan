import { CreatePostForm } from "@/components/create-post-form"
import { platformIcons } from "@/components/platform-icons"
import { PostsList } from "@/components/posts-list"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getIntegrations } from "@/functions/integrations"
import { createPost, deletePost, fetchRecentSocialPosts, getPosts } from "@/functions/posts"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Download } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/_protected/app/write")({
  loader: async () => {
    const integrations = await getIntegrations()
    return { integrations }
  },
  component: RouteComponent
})

function RouteComponent() {
  const { integrations } = Route.useLoaderData()
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>()

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
  const platformSupportsFetching = useMemo(() => {
    return currentIntegration?.supportsFetchingRecentPosts ?? false
  }, [currentIntegration])

  const { mutate: create, isPending } = useMutation({
    mutationFn: createPost,
    onSuccess: (_, { data: { scheduledAt } }) => {
      toast.success(scheduledAt ? "Post scheduled successfully!" : "Post published successfully!")
      handleClear()
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

  const handleCreatePost = (data: {
    integrationId: string
    content: string
    scheduledAt?: Date
  }) => {
    create({
      data: {
        integrationId: data.integrationId,
        content: data.content,
        scheduledAt: data.scheduledAt
      }
    })
  }

  const handleClear = () => {
    // This will be handled by the CreatePostForm component
  }

  const handleValidationError = (message: string) => {
    toast.error(message)
  }

  return (
    <div className="container mx-auto max-w-2xl flex-1 space-y-8 p-4">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl">Dashboard</h1>
        <p className="text-muted-foreground">Select a platform to manage your posts.</p>
      </div>
      <div className="w-full">
        <Select onValueChange={setSelectedIntegrationId} value={selectedIntegrationId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a platform" />
          </SelectTrigger>
          <SelectContent>
            {integrations.length > 0 ? (
              integrations.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  <div className="flex items-center gap-2">
                    {platformIcons[i.platform]}
                    <span>{i.platformAccountName}</span>
                  </div>
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-platforms" disabled>
                No platforms connected
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedIntegrationId && (
        <>
          <CreatePostForm
            selectedIntegrationId={selectedIntegrationId}
            currentIntegrationName={currentIntegration?.platformAccountName}
            isPending={isPending}
            onCreatePost={handleCreatePost}
            onClear={handleClear}
            onValidationError={handleValidationError}
          />
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Your Posts</h2>
              {platformSupportsFetching && (
                <Button onClick={handleFetchRecent} disabled={!selectedIntegrationId || isSyncingPosts} size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  {isSyncingPosts ? "Syncing..." : "Sync posts"}
                </Button>
              )}
            </div>
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
        </>
      )}
    </div>
  )
}
