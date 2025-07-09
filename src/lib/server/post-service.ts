import { db } from "@/database/db"
import { posts } from "@/database/schema"
import type { Platform } from "@/database/schema/integrations"
import { getEffectiveCredentials } from "@/lib/server/integrations"
import { eq } from "drizzle-orm"
import type { PostData } from "./social-platforms/base-platform"
import { PlatformFactory } from "./social-platforms/platform-factory"

export async function postToSocialMedia(postData: PostData) {
  const platform = PlatformFactory.getPlatform(postData.integration.platform)
  const credentials = await getEffectiveCredentials(
    postData.integration.platform as Platform,
    postData.userId
  )

  const result = await platform.post(postData, credentials)

  if (result.success) {
    // Aggiorna il post come postato con successo
    await db
      .update(posts)
      .set({
        status: "posted",
        postedAt: new Date(),
        postUrl: result.postUrl
      })
      .where(eq(posts.id, postData.id))

    console.log(`Successfully posted to ${postData.integration.platform}: ${postData.id}`)
  } else {
    // Aggiorna il post con l'errore
    throw new Error(result.error || "Failed to post to social media")
  }
}
