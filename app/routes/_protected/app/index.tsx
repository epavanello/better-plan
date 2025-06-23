import { platformIcons } from "@/components/platform-icons"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Platform } from "@/database/schema/integrations"
import { getIntegrations } from "@/functions/integrations"
import { createPost, getPosts } from "@/functions/posts"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { formatRelative } from "date-fns"
import { ExternalLink, Rocket, X } from "lucide-react"
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

    const { mutate: create, isPending } = useMutation({
        mutationFn: createPost,
        onSuccess: () => {
            toast.success("Post created successfully!")
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
        create({
            data: {
                integrationId,
                content
            }
        })
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
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={handleClear} disabled={isPending}>
                            <X className="mr-2 h-4 w-4" />
                            Clear
                        </Button>
                        <Button onClick={handleSubmit} disabled={isPending}>
                            <Rocket className="mr-2 h-4 w-4" />
                            {isPending ? "Posting..." : "Post"}
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
                                            {platformIcons[post.integration?.platform as Platform]}
                                            {post.integration?.platformAccountName}
                                            {" - "}
                                            <span className="capitalize">{post.status}</span>
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
