import { db } from "@/database/db"
import { type InsertPost, insertPostSchema, posts } from "@/database/schema"
import { integrations } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { postToSocialMedia } from "@/lib/server/post-service"
import { createServerFn } from "@tanstack/react-start"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

export const createPost = createServerFn({ method: "POST" })
    .validator((payload: Omit<InsertPost, "userId">) =>
        insertPostSchema.omit({ userId: true }).parse(payload)
    )
    .handler(async ({ data }) => {
        const session = await getSessionOrThrow()

        const [post] = await db
            .insert(posts)
            .values({
                ...data,
                userId: session.user.id,
                status: data.scheduledAt ? "scheduled" : "draft"
            })
            .returning()

        // Invia immediatamente solo se è un draft (non schedulato)
        if (post.status === "draft") {
            const [integration] = await db
                .select()
                .from(integrations)
                .where(eq(integrations.id, post.integrationId))

            if (!integration) {
                throw new Error("Integration not found")
            }

            try {
                await postToSocialMedia({
                    id: post.id,
                    content: post.content,
                    userId: post.userId,
                    integration: {
                        id: integration.id,
                        platform: integration.platform,
                        platformAccountId: integration.platformAccountId,
                        platformAccountName: integration.platformAccountName,
                        accessToken: integration.accessToken
                    }
                })
            } catch (error) {
                console.error("Failed to post immediately", error)
                await db
                    .update(posts)
                    .set({
                        status: "failed",
                        failReason: error instanceof Error ? error.message : "Unknown error"
                    })
                    .where(eq(posts.id, post.id))
                throw new Error("Failed to post to social media")
            }
        }

        return post
    })

export const getPosts = createServerFn({ method: "GET" }).handler(async () => {
    const session = await getSessionOrThrow()

    const result = await db
        .select({
            id: posts.id,
            content: posts.content,
            status: posts.status,
            createdAt: posts.createdAt,
            postUrl: posts.postUrl,
            scheduledAt: posts.scheduledAt,
            postedAt: posts.postedAt,
            integration: {
                platform: integrations.platform,
                platformAccountName: integrations.platformAccountName
            }
        })
        .from(posts)
        .innerJoin(integrations, eq(posts.integrationId, integrations.id))
        .where(eq(posts.userId, session.user.id))
        .orderBy(posts.createdAt)

    return result
})

export const deletePost = createServerFn({ method: "POST" })
    .validator((payload: { id: string }) => {
        return z.object({ id: z.string() }).parse(payload)
    })
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
