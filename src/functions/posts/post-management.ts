import { db } from "@/database/db"
import { posts } from "@/database/schema"
import { getSessionOrThrow } from "@/lib/auth"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"

const getPostsSchema = z.object({
  integrationId: z.string()
})

export const getPosts = createServerFn({ method: "GET" })
  .validator(getPostsSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    const userPosts = await db.query.posts.findMany({
      where: and(eq(posts.userId, session.user.id), eq(posts.integrationId, data.integrationId)),
      with: {
        integration: true
      },
      orderBy: [desc(posts.createdAt)]
    })
    return userPosts
  })

const deletePostSchema = z.object({
  id: z.string()
})

export const deletePost = createServerFn({ method: "POST" })
  .validator(deletePostSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    const [deletedPost] = await db
      .delete(posts)
      .where(and(eq(posts.id, data.id), eq(posts.userId, session.user.id)))
      .returning()

    if (!deletedPost) {
      throw new Error("Post not found or not authorized to delete")
    }

    return deletedPost
  })