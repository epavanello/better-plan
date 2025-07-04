import { platformIcons } from "@/components/platform-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getIntegrations } from "@/functions/integrations"
import { createPost, deletePost, fetchRecentSocialPosts, getPosts } from "@/functions/posts"
import { PopoverClose } from "@radix-ui/react-popover"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { formatRelative } from "date-fns"
import { CalendarClock, Download, ExternalLink, Rocket, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/_protected/app/")({
    loader: async () => {
        const integrations = await getIntegrations()
        return { integrations }
    },
    component: RouteComponent
})

function RouteComponent() {
    const { integrations } = Route.useLoaderData()
    const [content, setContent] = useState("")
    const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>()
    const [scheduledDateTime, setScheduledDateTime] = useState("")
    const [isPublishPopoverOpen, setIsPublishPopoverOpen] = useState(false)
    const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false)

    const {
        data: posts = [],
        isPending: isPostsPending,
        refetch: refetchPosts
    } = useQuery({
        queryKey: ["posts", selectedIntegrationId],
        queryFn: () => getPosts({ data: { integrationId: selectedIntegrationId } }),
        enabled: !!selectedIntegrationId
    })

    const currentIntegration = useMemo(
        () => integrations.find((i) => i.id === selectedIntegrationId),
        [integrations, selectedIntegrationId]
    )
    const platformSupportsFetching = useMemo(() => {
        return currentIntegration?.supportsFetchingRecentPosts ?? false
    }, [currentIntegration])

    const { mutate: create, isPending } = useMutation({
        mutationFn: createPost,
        onSuccess: () => {
            toast.success(
                scheduledDateTime ? "Post scheduled successfully!" : "Post published successfully!"
            )
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

    const handleClear = () => {
        setContent("")
        setScheduledDateTime("")
        setIsPublishPopoverOpen(false)
        setIsSchedulePopoverOpen(false)
    }

    const handleFetchRecent = () => {
        if (!selectedIntegrationId) {
            toast.error("Please select a platform to import posts from.")
            return
        }
        fetchRecent({ data: { integrationId: selectedIntegrationId } })
    }

    const handlePublishNow = () => {
        if (!selectedIntegrationId) {
            toast.error("Please select a platform.")
            return
        }
        if (!content) {
            toast.error("Please enter some content.")
            return
        }

        create({
            data: {
                integrationId: selectedIntegrationId,
                content,
                scheduledAt: undefined
            }
        })
        setIsPublishPopoverOpen(false)
    }

    const handleSchedulePost = () => {
        if (!selectedIntegrationId) {
            toast.error("Please select a platform.")
            return
        }
        if (!content) {
            toast.error("Please enter some content.")
            return
        }
        if (!scheduledDateTime) {
            toast.error("Please select a date and time for scheduling.")
            return
        }
        const scheduledDate = new Date(scheduledDateTime)
        if (scheduledDate <= new Date()) {
            toast.error("Scheduled time must be in the future.")
            return
        }

        create({
            data: {
                integrationId: selectedIntegrationId,
                content,
                scheduledAt: scheduledDate
            }
        })
        setIsSchedulePopoverOpen(false)
    }

    // Calculate minimum datetime (current time + 5 minutes)
    const getMinDateTime = () => {
        const now = new Date()
        now.setMinutes(now.getMinutes() + 5)
        return now.toISOString().slice(0, 16)
    }

    const canSubmit = selectedIntegrationId && content && !isPending

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
                    <div className="w-full rounded-lg border p-4">
                        <h2 className="mb-4 font-semibold text-lg">Create a new post</h2>
                        <div className="grid gap-4">
                            <Textarea
                                placeholder="What's on your mind?"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={handleClear} disabled={isPending}>
                                    <X />
                                    Clear
                                </Button>
                                <Popover
                                    open={isPublishPopoverOpen}
                                    onOpenChange={setIsPublishPopoverOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <Button disabled={!canSubmit}>
                                            <Rocket />
                                            Post Now
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80" side="bottom">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <h3 className="font-medium text-lg">
                                                    Publish Post
                                                </h3>
                                                <p className="text-muted-foreground text-sm">
                                                    Your post will be published immediately to{" "}
                                                    {currentIntegration?.platformAccountName}.
                                                </p>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setIsPublishPopoverOpen(false)}
                                                    disabled={isPending}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handlePublishNow}
                                                    disabled={isPending}
                                                >
                                                    {isPending ? "Publishing..." : "Publish Now"}
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Popover
                                    open={isSchedulePopoverOpen}
                                    onOpenChange={setIsSchedulePopoverOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" disabled={!canSubmit}>
                                            <CalendarClock />
                                            Schedule
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <h3 className="font-medium text-lg">
                                                    Schedule Post
                                                </h3>
                                                <p className="text-muted-foreground text-sm">
                                                    Choose when to publish your post to{" "}
                                                    {currentIntegration?.platformAccountName}.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="schedule-time">Schedule for:</Label>
                                                <Input
                                                    id="schedule-time"
                                                    type="datetime-local"
                                                    value={scheduledDateTime}
                                                    onChange={(e) =>
                                                        setScheduledDateTime(e.target.value)
                                                    }
                                                    min={getMinDateTime()}
                                                    disabled={isPending}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setIsSchedulePopoverOpen(false)}
                                                    disabled={isPending}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handleSchedulePost}
                                                    disabled={isPending || !scheduledDateTime}
                                                >
                                                    {isPending ? "Scheduling..." : "Schedule Post"}
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                    <div className="w-full">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-semibold text-lg">Your Posts</h2>
                            {platformSupportsFetching && (
                                <Button
                                    onClick={handleFetchRecent}
                                    disabled={!selectedIntegrationId || isSyncingPosts}
                                    size="sm"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    {isSyncingPosts ? "Syncing..." : "Sync posts"}
                                </Button>
                            )}
                        </div>
                        <div className="rounded-lg border">
                            <div className="divide-y divide-border">
                                {isPostsPending ? (
                                    <div className="p-4 text-center text-muted-foreground">
                                        Loading posts...
                                    </div>
                                ) : posts.length > 0 ? (
                                    posts.map((post) => (
                                        <div key={post.id} className="p-4">
                                            <div className="mb-2 flex items-center justify-between text-muted-foreground text-sm">
                                                <div className="flex items-center gap-2">
                                                    {platformIcons[post.integration.platform]}
                                                    {post.integration.platformAccountName}
                                                    {" - "}
                                                    <span className="capitalize">
                                                        {post.status}
                                                    </span>
                                                    {post.status === "scheduled" &&
                                                        post.scheduledAt && (
                                                            <span className="text-blue-600">
                                                                (scheduled for{" "}
                                                                {formatRelative(
                                                                    new Date(post.scheduledAt),
                                                                    new Date()
                                                                )}
                                                                )
                                                            </span>
                                                        )}
                                                    {post.source === "imported" && (
                                                        <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">
                                                            Imported
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <time
                                                        title={new Date(
                                                            post.createdAt
                                                        ).toLocaleString()}
                                                        dateTime={new Date(
                                                            post.createdAt
                                                        ).toISOString()}
                                                    >
                                                        {formatRelative(
                                                            new Date(post.createdAt),
                                                            new Date()
                                                        )}
                                                    </time>
                                                    {post.postUrl && (
                                                        <a
                                                            href={post.postUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-muted-foreground hover:text-foreground"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    {post.status === "scheduled" && (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <Trash2 />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                                className="w-64"
                                                                side="bottom"
                                                            >
                                                                <div className="space-y-2">
                                                                    <h4 className="font-medium text-sm">
                                                                        Delete Post
                                                                    </h4>
                                                                    <p className="text-muted-foreground text-xs">
                                                                        Are you sure you want to
                                                                        delete this scheduled post?
                                                                    </p>
                                                                    <div className="flex justify-end gap-2">
                                                                        <PopoverClose asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                            >
                                                                                Cancel
                                                                            </Button>
                                                                        </PopoverClose>
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                deleteMutate({
                                                                                    data: {
                                                                                        id: post.id
                                                                                    }
                                                                                })
                                                                            }
                                                                        >
                                                                            Delete
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    )}
                                                </div>
                                            </div>
                                            <p>{post.content}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-muted-foreground">
                                        You haven't created any posts yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
