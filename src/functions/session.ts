import { getSession } from "@/lib/auth"
import { createServerFn } from "@tanstack/react-start"

export const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
  return await getSession()
})
