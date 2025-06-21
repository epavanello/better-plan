import { json } from "@tanstack/react-start"
import { createAPIFileRoute } from "@tanstack/react-start/api"

export const APIRoute = createAPIFileRoute("/api/test")({
    GET: ({ request, params }) => {
        return json({ message: 'Hello "/api/test"!' })
    },
    POST: ({ request, params }) => {
        return json({ message: 'Hello "/api/test"!' })
    }
})
