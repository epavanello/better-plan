import { platformIcons } from "@/components/platform-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getIntegrations } from "@/functions/integrations"
import { createPost, getPosts } from "@/functions/posts"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { formatRelative } from "date-fns"
import { CalendarClock, ExternalLink, Rocket, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/_protected/app/")({
    loader: async () => {
        const [integrations, posts] = await Promise.all([getIntegrations(), getPosts()])
        return { integrations, posts }
    },
    component: RouteComponent
})

function RouteComponent() {
    const { integrations, posts } = Route.useLoaderData()
    const router = useRouter()
    const [content, setContent] = useState("")
    const [integrationId, setIntegrationId] = useState<string | undefined>()
    const [publishMode, setPublishMode] = useState<"immediate" | "scheduled">("immediate")
    const [scheduledDateTime, setScheduledDateTime] = useState("")

    const { mutate: create, isPending } = useMutation({
        mutationFn: createPost,
        onSuccess: () => {
            toast.success(
                publishMode === "scheduled"
                    ? "Post scheduled successfully!"
                    : "Post created successfully!"
            )
            handleClear()
            router.invalidate()
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    const handleClear = () => {
        setContent("")
        setIntegrationId(undefined)
        setPublishMode("immediate")
        setScheduledDateTime("")
    }

    const handleSubmit = () => {
        if (!integrationId) {
            toast.error("Please select a platform.")
            return
        }
        if (!content) {
            toast.error("Please enter some content.")
            return
        }
        if (publishMode === "scheduled") {
            if (!scheduledDateTime) {
                toast.error("Please select a date and time for scheduling.")
                return
            }
            const scheduledDate = new Date(scheduledDateTime)
            if (scheduledDate <= new Date()) {
                toast.error("Scheduled time must be in the future.")
                return
            }
        }

        create({
            data: {
                integrationId,
                content,
                scheduledAt: publishMode === "scheduled" ? new Date(scheduledDateTime) : undefined
            }
        })
    }

    // Calcola il minimo datetime (ora corrente + 5 minuti)
    const getMinDateTime = () => {
        const now = new Date()
        now.setMinutes(now.getMinutes() + 5)
        return now.toISOString().slice(0, 16)
    }

    return (
        <div className="container mx-auto max-w-2xl flex-1 space-y-8 p-4">
            <div className="space-y-2">
                <h1 className="font-bold text-2xl">Dashboard</h1>
                <p className="text-muted-foreground">
                    Create a new post and view your scheduled and published content.
                </p>
            </div>
            <div className="w-full rounded-lg border p-4">
                <h2 className="mb-4 font-semibold text-lg">Create a new post</h2>
                <div className="grid gap-4">
                    <Select onValueChange={setIntegrationId} value={integrationId}>
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
                    <Textarea
                        placeholder="What's on your mind?"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={6}
                    />

                    {/* Sezione scheduling */}
                    <div className="space-y-3">
                        <div className="space-y-3">
                            <Label>Publishing option:</Label>
                            <RadioGroup
                                value={publishMode}
                                onValueChange={(value) =>
                                    setPublishMode(value as "immediate" | "scheduled")
                                }
                                disabled={isPending}
                            >
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="immediate" id="immediate" />
                                    <Label htmlFor="immediate">Publish Now</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RadioGroupItem value="scheduled" id="scheduled" />
                                    <Label htmlFor="scheduled">Schedule</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {publishMode === "scheduled" && (
                            <div className="space-y-2">
                                <label htmlFor="scheduled-time" className="font-medium text-sm">
                                    Schedule for:
                                </label>
                                <Input
                                    id="scheduled-time"
                                    type="datetime-local"
                                    value={scheduledDateTime}
                                    onChange={(e) => setScheduledDateTime(e.target.value)}
                                    min={getMinDateTime()}
                                    disabled={isPending}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={handleClear} disabled={isPending}>
                            <X className="mr-2 h-4 w-4" />
                            Clear
                        </Button>
                        <Button onClick={handleSubmit} disabled={isPending}>
                            {publishMode === "scheduled" ? (
                                <>
                                    <CalendarClock className="mr-2 h-4 w-4" />
                                    {isPending ? "Scheduling..." : "Schedule Post"}
                                </>
                            ) : (
                                <>
                                    <Rocket className="mr-2 h-4 w-4" />
                                    {isPending ? "Publishing..." : "Publish Now"}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="w-full">
                <h2 className="mb-4 font-semibold text-lg">Your Posts</h2>
                <div className="rounded-lg border">
                    <div className="divide-y divide-border">
                        {posts.length > 0 ? (
                            posts.map((post) => (
                                <div key={post.id} className="p-4">
                                    <div className="mb-2 flex items-center justify-between text-muted-foreground text-sm">
                                        <div className="flex items-center gap-2">
                                            {platformIcons[post.integration.platform]}
                                            {post.integration.platformAccountName}
                                            {" - "}
                                            <span className="capitalize">{post.status}</span>
                                            {post.status === "scheduled" && post.scheduledAt && (
                                                <span className="text-blue-600">
                                                    (scheduled for{" "}
                                                    {formatRelative(
                                                        new Date(post.scheduledAt),
                                                        new Date()
                                                    )}
                                                    )
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <time
                                                title={new Date(post.createdAt).toLocaleString()}
                                                dateTime={new Date(post.createdAt).toISOString()}
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
        </div>
    )
}
