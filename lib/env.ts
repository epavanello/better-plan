import { z } from "zod"

const envSchema = z
    .object({
        POSTGRES_HOST: z.string(),
        POSTGRES_PORT: z.coerce.number().int(),
        POSTGRES_USER: z.string(),
        POSTGRES_PASSWORD: z.string(),
        POSTGRES_DB: z.string(),
        APP_URL: z.string().url(),
        X_CLIENT_ID: z.string().optional(),
        X_CLIENT_SECRET: z.string().optional(),
        BETTER_AUTH_SECRET: z.string().min(1),
        NODE_ENV: z.enum(["development", "production"]).default("development"),
        DISABLE_SIGNUP: z
            .string()
            .default("false")
            .transform((val) => val.toLowerCase() === "true")
            .optional()
    })
    .transform((env) => ({
        ...env,
        DATABASE_URL: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`
    }))

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
