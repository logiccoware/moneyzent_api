import { z } from "zod";

export const envSchema = z
	.object({
		// App
		APP_ENV: z
			.enum(["development", "staging", "prod", "test"])
			.default("development"),
		PORT: z.coerce.number().int().positive().optional().default(3000),
		// PostgreSQL
		DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
		DATABASE_POOL_SIZE: z.coerce.number().int().positive(),
		// Better Auth
		BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
		BETTER_AUTH_URL: z.string().min(1, "BETTER_AUTH_URL is required"),
		// CORS
		CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
		// Swagger
		SWAGGER_ENABLED: z
			.enum(["true", "false"])
			.default("false")
			.transform((value) => value === "true"),
		SWAGGER_BASIC_AUTH_USER: z.string().optional(),
		SWAGGER_BASIC_AUTH_PASS: z.string().optional(),
		// OpenTelemetry / Dash0
		OTEL_ENABLED: z
			.enum(["true", "false"])
			.default("false")
			.transform((value) => value === "true"),
		OTEL_SERVICE_NAME: z.string().optional(),
		OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
		OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.APP_ENV === "prod") {
			if (!data.OTEL_EXPORTER_OTLP_ENDPOINT) {
				ctx.addIssue({
					code: "custom",
					path: ["OTEL_EXPORTER_OTLP_ENDPOINT"],
					message: "Required in prod environment",
				});
			}
			if (!data.OTEL_EXPORTER_OTLP_HEADERS) {
				ctx.addIssue({
					code: "custom",
					path: ["OTEL_EXPORTER_OTLP_HEADERS"],
					message: "Required in prod environment",
				});
			}
		}
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
