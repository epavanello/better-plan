import { db } from "@/database/db"
import { type InsertPost, insertPostSchema, posts } from "@/database/schema"
import { integrations } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { envConfig } from "@/lib/env"
import { getEffectiveCredentials } from "@/lib/server/integrations"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { TwitterApi } from "twitter-api-v2"

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

        if (post.status === "draft") {
            const credentials = await getEffectiveCredentials("x", session.user.id)

            if (!credentials) {
                throw new Error("Credentials not found")
            }

            const [integration] = await db
                .select()
                .from(integrations)
                .where(eq(integrations.id, post.integrationId))

            if (!integration) {
                throw new Error("Integration not found")
            }
            if (!integration.accessToken) {
                throw new Error("Access token not found")
            }

            const [accessToken, accessSecret] = integration.accessToken.split(":")

            const twitterClient = new TwitterApi({
                appKey: credentials.clientId,
                appSecret: credentials.clientSecret,
                accessToken: accessToken,
                accessSecret: accessSecret
            })

            try {
                const tweet = await twitterClient.v2.tweet(post.content)
                await db
                    .update(posts)
                    .set({
                        status: "posted",
                        postedAt: new Date(),
                        postUrl: `https://x.com/${integration.platformAccountName}/status/${tweet.data.id}`
                    })
                    .where(eq(posts.id, post.id))
            } catch (error) {
                console.error("Failed to post to X", error)
                await db
                    .update(posts)
                    .set({
                        status: "failed",
                        failReason: error instanceof Error ? error.message : "Unknown error"
                    })
                    .where(eq(posts.id, post.id))
                throw new Error("Failed to post to X")
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
