import { z } from "zod"

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    APP_URL: z.string().url(),
    X_CLIENT_ID: z.string().optional(),
    X_CLIENT_SECRET: z.string().optional(),
    NODE_ENV: z.enum(["development", "production"]).default("development")
})

export type EnvConfig = z.infer<typeof envSchema>

function formatValidationError(error: z.ZodError): string {
    const issues = error.issues
        .map((issue) => {
            const path = issue.path.join(".")
            return `- ${path}: ${issue.message}`
        })
        .join("\n")

    return `Environment validation failed:\n${issues}\n\nPlease check your .env file and ensure all required variables are set correctly.`
}

let envConfig: EnvConfig

try {
    envConfig = envSchema.parse(process.env)
} catch (error) {
    if (error instanceof z.ZodError) {
        throw new Error(formatValidationError(error))
    }
    throw error
}

export { envConfig }
