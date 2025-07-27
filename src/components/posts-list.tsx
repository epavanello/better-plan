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

// Utility function to convert URLs in text to clickable links
function renderContentWithLinks(content: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = content.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-blue-600 underline hover:text-blue-800"
        >
          {part}
        </a>
      )
    }
    return part
  })
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
        {posts.map((post) => {
          const now = new Date()
          const dateRef = post.postedAt ?? post.scheduledAt ?? post.createdAt
          return (
            <div key={post.id} className="@container p-4">
              <div className="mb-2 flex @[30rem]:flex-row flex-col items-start @[30rem]:items-center justify-between gap-y-2 text-muted-foreground text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {platformIcons[post.integration.platform]}
                  <span className="font-medium">{post.integration.platformAccountName}</span>
                  {post.destinationName && (
                    <>
                      {" → "}
                      <span className="font-medium">{post.destinationName}</span>
                    </>
                  )}
                  {" - "}
                  <span className="capitalize">{post.status}</span>
                  {post.status === "scheduled" && post.scheduledAt && (
                    <span className="text-blue-600">({formatRelative(post.scheduledAt, now)})</span>
                  )}
                  {post.source === "imported" && (
                    <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">Imported</span>
                  )}
                </div>
                <div className="flex @[30rem]:w-auto w-full items-center @[30rem]:justify-start justify-between gap-2">
                  <time title={dateRef.toLocaleString()} dateTime={dateRef.toISOString()}>
                    {formatRelative(dateRef, now)}
                  </time>
                  <div className="flex items-center gap-2">
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
                            <Trash2 className="h-4 w-4" />
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
              </div>
              <p className="whitespace-pre-wrap">{renderContentWithLinks(post.content)}</p>
              {post.media && post.media.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.media.map((media) => (
                    <div key={media.id} className="relative">
                      {media.mimeType.startsWith("image/") ? (
                        <img
                          src={`data:${media.mimeType};base64,${media.content}`}
                          alt="Post media"
                          className="h-20 w-20 rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted">
                          <span className="text-muted-foreground text-xs">Media</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
