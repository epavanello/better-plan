import { z } from "zod"

const envSchema = z.object({
  APP_URL: z.string().url(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DISABLE_SIGNUP: z
    .string()
    .default("false")
    .transform((val) => val.toLowerCase() === "true")
    .optional(),
  DATABASE_URL: z.string(),
  DATABASE_AUTH_TOKEN: z.string(),
  DATABASE_DIALECT: z.union([z.literal("turso"), z.literal("sqlite")]).default("turso")
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
