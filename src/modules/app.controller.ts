import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { AllowAnonymous } from "@/modules/auth/decorators/allow-anonymous.decorator";
import { Session } from "@/modules/auth/decorators/session.decorator";
import { UserSession } from "@/modules/auth/types";

@Controller()
export class AppController {
	@SkipThrottle()
	@AllowAnonymous()
	@Get("health")
	healthCheck() {
		return {
			status: "ok",
			timestamp: new Date().toISOString(),
		};
	}

	@Get("user")
	async getProfile(@Session() session: UserSession) {
		return { user: session.user };
	}
}
