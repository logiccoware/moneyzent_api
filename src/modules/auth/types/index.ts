import { auth } from "@/lib/auth";

export type UserSession = typeof auth.$Infer.Session.session & {
	user: typeof auth.$Infer.Session.user;
};

export interface AuthModuleOptions {
	auth: typeof auth;
}

export const AUTH_OPTIONS = "AUTH_OPTIONS";
