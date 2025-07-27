import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  server: {
    port: 3000
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"]
    }),
    tanstackStart({
      server: {
        entry: "./ssr.tsx"
      }
    }),
    tailwindcss()
  ],
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version)
  },
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
})
