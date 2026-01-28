import { envSchema, validate } from "@/common/config/env.config";

describe("env config validation", () => {
	const requiredConfig = {
		DATABASE_URL: "postgres://user:pass@localhost:5432/db",
		BETTER_AUTH_SECRET: "secret",
		BETTER_AUTH_URL: "http://localhost:3000",
		CORS_ORIGIN: "http://localhost:5173",
	};

	it("applies defaults when optional values are missing", () => {
		const result = validate(requiredConfig);

		expect(result.APP_ENV).toBe("development");
		expect(result.PORT).toBe(3000);
		expect(result.SWAGGER_ENABLED).toBe(false);
	});

	it("transforms swagger enabled to boolean", () => {
		const result = validate({
			...requiredConfig,
			SWAGGER_ENABLED: "true",
		});

		expect(result.SWAGGER_ENABLED).toBe(true);
	});

	it("throws a readable error when required values are missing", () => {
		expect(() => validate({})).toThrow(
			/Environment validation failed:\nDATABASE_URL: /,
		);
	});

	it("rejects invalid enum values", () => {
		const result = envSchema.safeParse({
			...requiredConfig,
			APP_ENV: "invalid",
		});

		expect(result.success).toBe(false);
	});
});
