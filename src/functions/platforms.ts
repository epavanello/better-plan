import type { Platform } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { PlatformFactory } from "@/lib/server/social-platforms/platform-factory"
import { createServerFn } from "@tanstack/react-start"

// Funzione per ottenere informazioni di tutte le piattaforme
export const getAllPlatformInfo = createServerFn({ method: "GET" }).handler(async () => {
  return PlatformFactory.getAllPlatformInfo()
})

// Funzione per ottenere informazioni di una specifica piattaforma
export const getPlatformInfo = createServerFn({ method: "POST" })
  .validator((platform: Platform) => platform)
  .handler(async ({ data: platform }) => {
    return PlatformFactory.getPlatformInfo(platform)
  })

// Funzione per ottenere solo le piattaforme implementate
export const getImplementedPlatforms = createServerFn({ method: "GET" }).handler(async () => {
  return PlatformFactory.getImplementedPlatforms()
})

// Funzione standard per iniziare l'autorizzazione di una piattaforma
export const startPlatformAuthorization = createServerFn({ method: "POST" })
  .validator((platform: Platform) => platform)
  .handler(async ({ data: platform }) => {
    const session = await getSessionOrThrow()
    const platformInstance = PlatformFactory.getPlatform(platform)

    if (!platformInstance.isImplemented()) {
      throw new Error(`Platform ${platform} is not yet implemented`)
    }

    // Ora chiamiamo direttamente il metodo della classe specifica
    return await platformInstance.startAuthorization(session.user.id)
  })
