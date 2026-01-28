import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Inject,
	UnauthorizedException,
	ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AUTH_OPTIONS, AuthModuleOptions } from "../types";
import { ALLOW_ANONYMOUS_KEY } from "../decorators/allow-anonymous.decorator";
import { OPTIONAL_AUTH_KEY } from "../decorators/optional-auth.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		@Inject(AUTH_OPTIONS) private authOptions: AuthModuleOptions,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check for @AllowAnonymous decorator on handler or class
		const allowAnonymous = this.reflector.getAllAndOverride<boolean>(
			ALLOW_ANONYMOUS_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (allowAnonymous) {
			return true;
		}

		// Check for @OptionalAuth decorator on handler or class
		const optionalAuth = this.reflector.getAllAndOverride<boolean>(
			OPTIONAL_AUTH_KEY,
			[context.getHandler(), context.getClass()],
		);

		const request = context.switchToHttp().getRequest<Request>();

		// Get session from Better Auth
		const session = await this.authOptions.auth.api.getSession({
			headers: request.headers as any,
		});

		if (!session) {
			if (optionalAuth) {
				request.session = null;
				return true;
			}
			throw new UnauthorizedException("Authentication required");
		}

		// Attach session to request
		request.session = session;

		// Check for @Roles decorator on handler or class
		const requiredRoles = this.reflector.getAllAndOverride<string[]>(
			ROLES_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (requiredRoles && requiredRoles.length > 0) {
			// Check if user has required roles
			// Note: This assumes Better Auth access control plugin is configured
			// and the session contains role information
			const userRoles = (session.user as any).role || [];
			const hasRole = requiredRoles.some((role) => userRoles.includes(role));

			if (!hasRole) {
				throw new ForbiddenException(
					`Access denied. Required roles: ${requiredRoles.join(", ")}`,
				);
			}
		}

		return true;
	}
}
