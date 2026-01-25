declare global {
	namespace NodeJS {
		interface ProcessEnv {
			APP_ENV: "development" | "staging" | "prod" | "test";
			PORT: number;
			DATABASE_URL: string;
			BETTER_AUTH_SECRET: string;
			BETTER_AUTH_URL: string;
			CORS_ORIGIN: string;
		}
	}
}

export {};
