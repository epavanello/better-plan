import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
    component: App
})

function App() {
    return (
        <div className="flex grow flex-col text-center">
            <header className="flex grow flex-col items-center justify-center text-[calc(10px+2vmin)]">
                hi
            </header>
        </div>
    )
}
