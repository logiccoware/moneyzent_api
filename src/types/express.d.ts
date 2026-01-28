import type { AuthModuleOptions } from "@/modules/auth/types";

declare global {
	namespace Express {
		interface Request {
			/**
			 * Populated by `AuthGuard` after successful authentication.
			 * `null` when `@OptionalAuth()` is used and no session is present.
			 */
			session?: Awaited<
				ReturnType<AuthModuleOptions["auth"]["api"]["getSession"]>
			> | null;
		}
	}
}

export {};
