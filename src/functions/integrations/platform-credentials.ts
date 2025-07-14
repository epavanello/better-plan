import { db } from "@/database/db"
import { type Platform, userAppCredentials } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { getPlatformCredentialsInfo, getUserCredentialsInfo, validatePlatformCredentials } from "@/lib/server/integrations"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import { ulid } from "ulid"
import { z } from "zod"

const platformSchema = z.enum(["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"])

export const getPlatformRequiresUserCredentials = createServerFn({ method: "GET" })
  .validator(platformSchema)
  .handler(async ({ data: platform }) => {
    return await getPlatformCredentialsInfo(platform)
  })

export const getUserPlatformStatus = createServerFn({ method: "GET" })
  .validator(platformSchema)
  .handler(async ({ data: platform }) => {
    const session = await getSessionOrThrow()
    const userInfo = await getUserCredentialsInfo(platform, session.user.id)
    const platformInfo = await getPlatformCredentialsInfo(platform)

    return {
      ...userInfo,
      ...platformInfo
    }
  })

export const getUserAppCredentials = createServerFn({ method: "GET" })
  .validator(platformSchema)
  .handler(async ({ data: platform }) => {
    const session = await getSessionOrThrow()

    const credentials = await db.query.userAppCredentials.findFirst({
      where: and(eq(userAppCredentials.userId, session.user.id), eq(userAppCredentials.platform, platform))
    })

    if (!credentials) {
      return null
    }

    // Return credentials without sensitive data
    return {
      id: credentials.id,
      platform: credentials.platform,
      appId: credentials.appId,
      hasAppSecret: !!credentials.appSecret,
      redirectUri: credentials.redirectUri,
      isValid: credentials.isValid,
      validationError: credentials.validationError,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt
    }
  })

const saveCredentialsSchema = z.object({
  platform: platformSchema,
  appId: z.string().min(1),
  appSecret: z.string().min(1),
  redirectUri: z.string().url()
})

export const saveUserAppCredentials = createServerFn({ method: "POST" })
  .validator(saveCredentialsSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    // Validate credentials
    const validationResult = await validatePlatformCredentials(data.platform, {
      appId: data.appId,
      appSecret: data.appSecret,
      redirectUri: data.redirectUri
    })

    // Check if credentials already exist
    const existingCredentials = await db.query.userAppCredentials.findFirst({
      where: and(eq(userAppCredentials.userId, session.user.id), eq(userAppCredentials.platform, data.platform))
    })

    const credentialsData = {
      userId: session.user.id,
      platform: data.platform,
      appId: data.appId,
      appSecret: data.appSecret,
      redirectUri: data.redirectUri,
      isValid: validationResult.isValid,
      validationError: validationResult.error || null,
      updatedAt: new Date()
    }

    if (existingCredentials) {
      // Update existing credentials
      await db.update(userAppCredentials).set(credentialsData).where(eq(userAppCredentials.id, existingCredentials.id))
    } else {
      // Create new credentials
      await db.insert(userAppCredentials).values({
        id: ulid(),
        ...credentialsData,
        createdAt: new Date()
      })
    }

    return {
      success: true,
      isValid: validationResult.isValid,
      error: validationResult.error
    }
  })

const deleteCredentialsSchema = z.object({
  platform: platformSchema
})

export const deleteUserAppCredentials = createServerFn({ method: "POST" })
  .validator(deleteCredentialsSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    await db
      .delete(userAppCredentials)
      .where(and(eq(userAppCredentials.userId, session.user.id), eq(userAppCredentials.platform, data.platform)))

    return { success: true }
  })