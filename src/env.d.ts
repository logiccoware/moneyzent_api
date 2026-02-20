declare global {
	namespace NodeJS {
		interface ProcessEnv {
			APP_ENV: "development" | "staging" | "prod" | "test";
			PORT: number;
			DATABASE_URL: string;
			DATABASE_POOL_SIZE: number;
			BETTER_AUTH_SECRET: string;
			BETTER_AUTH_URL: string;
			CORS_ORIGIN: string;
			SWAGGER_ENABLED: "true" | "false";
			SWAGGER_BASIC_AUTH_USER: string;
			SWAGGER_BASIC_AUTH_PASS: string;
		}
	}
}
