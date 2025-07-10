import { platformIcons } from "@/components/platform-icons"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { getPosts } from "@/functions/posts"
import { PopoverClose } from "@radix-ui/react-popover"
import { formatRelative } from "date-fns"
import { ExternalLink, Trash2 } from "lucide-react"

interface PostsListProps {
  posts: Awaited<ReturnType<typeof getPosts>>
  isPending: boolean
  onDeletePost: (postId: string) => void
}

export function PostsList({ posts, isPending, onDeletePost }: PostsListProps) {
  if (isPending) {
    return (
      <div className="rounded-lg border">
        <div className="p-4 text-center text-muted-foreground">Loading posts...</div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border">
        <div className="p-4 text-center text-muted-foreground">You haven't created any posts yet.</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <div className="divide-y divide-border">
        {posts.map((post) => (
          <div key={post.id} className="p-4">
            <div className="mb-2 flex items-center justify-between text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                {platformIcons[post.integration.platform]}
                {post.integration.platformAccountName}
                {" - "}
                <span className="capitalize">{post.status}</span>
                {post.status === "scheduled" && post.scheduledAt && (
                  <span className="text-blue-600">(scheduled for {formatRelative(new Date(post.scheduledAt), new Date())})</span>
                )}
                {post.source === "imported" && (
                  <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">Imported</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <time title={new Date(post.createdAt).toLocaleString()} dateTime={new Date(post.createdAt).toISOString()}>
                  {formatRelative(new Date(post.createdAt), new Date())}
                </time>
                {post.postUrl && (
                  <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
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
                    <PopoverContent className="w-64" side="bottom">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Delete Post</h4>
                        <p className="text-muted-foreground text-xs">Are you sure you want to delete this scheduled post?</p>
                        <div className="flex justify-end gap-2">
                          <PopoverClose asChild>
                            <Button variant="ghost" size="sm">
                              Cancel
                            </Button>
                          </PopoverClose>
                          <Button variant="destructive" size="sm" onClick={() => onDeletePost(post.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
