declare global {
	namespace NodeJS {
		interface ProcessEnv {
			APP_ENV: "development" | "staging" | "production" | "test";
			PORT: number;
			DATABASE_URL: string;
			DATABASE_POOL_SIZE: number;
			BETTER_AUTH_SECRET: string;
			BETTER_AUTH_URL: string;
			CORS_ORIGIN: string;
		}
	}
}

export {};
