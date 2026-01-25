import { z } from "zod";

export const envSchema = z.object({
	// App
	APP_ENV: z
		.enum(["development", "staging", "production", "test"])
		.default("development"),
	PORT: z.coerce.number().int().positive().optional().default(3000),
	// PostgreSQL
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	DATABASE_POOL_SIZE: z.coerce
		.number()
		.int()
		.positive("DATABASE_POOL_SIZE must be a positive integer")
		.default(10),
	// Better Auth
	BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
	BETTER_AUTH_URL: z.string().min(1, "BETTER_AUTH_URL is required"),
	// CORS
	CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): EnvConfig {
	const result = envSchema.safeParse(config);

	if (!result.success) {
		const errors = result.error.issues
			.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
			.join("\n");
		throw new Error(`Environment validation failed:\n${errors}`);
	}

	return result.data;
}
