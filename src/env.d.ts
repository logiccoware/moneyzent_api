import type { AuthModuleOptions } from "@/modules/auth/types";

type AuthSession = Awaited<
	ReturnType<AuthModuleOptions["auth"]["api"]["getSession"]>
>;

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

	namespace Express {
		interface Request {
			/**
			 * Populated by `AuthGuard` after successful authentication.
			 * `null` when `@OptionalAuth()` is used and no session is present.
			 */
			session?: AuthSession | null;
		}
	}
}
