import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "@tanstack/react-start/config"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
    vite: {
        plugins: [
            tsConfigPaths({
                projects: ["./tsconfig.json"]
            }),
            tailwindcss()
        ],
        build: {
            // Ensure deterministic builds
            rollupOptions: {
                output: {
                    // In production, use fixed names to avoid hash mismatches between client and SSR
                    assetFileNames: (assetInfo) => {
                        if (process.env.NODE_ENV === "production") {
                            if (assetInfo.name?.endsWith(".css")) {
                                // workaround for https://github.com/TanStack/router/issues/3306
                                return "assets/globals.css"
                            }
                            return "assets/[name]-[hash][extname]"
                        }
                        return "assets/[name]-[hash][extname]"
                    }
                }
            }
        }
    }
})
