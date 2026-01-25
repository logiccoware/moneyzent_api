import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserSession } from "@/modules/auth/types";

export const Session = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): UserSession | null => {
		const request = ctx.switchToHttp().getRequest();
		return request.session || null;
	},
);
