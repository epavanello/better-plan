/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PLAUSIBLE_DOMAIN?: string
    readonly VITE_PLAUSIBLE_SCRIPT_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
} 