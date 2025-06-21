import { Button } from "@/components/ui/button"
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
import { Rocket, X } from "lucide-react"
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
            toast.error("Please select an integration.")
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
        <div className="flex h-full w-full flex-1 flex-col items-center gap-4 p-4">
            <div className="w-full max-w-lg rounded-lg border p-4">
                <h2 className="mb-4 font-semibold text-lg">Create a new post</h2>
                <div className="grid gap-4">
                    <Select onValueChange={setIntegrationId} value={integrationId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an integration" />
                        </SelectTrigger>
                        <SelectContent>
                            {integrations.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                    {i.platformAccountName} ({i.platform})
                                </SelectItem>
                            ))}
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
            <div className="w-full max-w-lg">
                <h2 className="mb-4 font-semibold text-lg">Your Posts</h2>
                <div className="rounded-lg border">
                    <div className="divide-y divide-border">
                        {posts.length > 0 ? (
                            posts.map((post) => (
                                <div key={post.id} className="p-4">
                                    <p className="mb-2 text-muted-foreground text-sm">
                                        {post.integration?.platformAccountName} (
                                        {post.integration?.platform}) -{" "}
                                        <span className="capitalize">{post.status}</span>
                                    </p>
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
