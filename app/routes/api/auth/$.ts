import { auth } from "@/lib/auth"
import { createAPIFileRoute } from "@tanstack/react-start/api"

export const APIRoute = createAPIFileRoute("/api/auth/$")({
    GET: ({ request }) => auth.handler(request),
    POST: ({ request }) => auth.handler(request)
})
