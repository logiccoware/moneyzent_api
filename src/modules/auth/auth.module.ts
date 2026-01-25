import { Module, DynamicModule, Global } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./guards/auth.guard";
import { AUTH_OPTIONS, AuthModuleOptions } from "./types";

@Global()
@Module({})
export class AuthModule {
	static forRoot(options: AuthModuleOptions): DynamicModule {
		return {
			module: AuthModule,
			providers: [
				{
					provide: AUTH_OPTIONS,
					useValue: options,
				},
				{
					provide: APP_GUARD,
					useClass: AuthGuard,
				},
			],
			exports: [AUTH_OPTIONS],
		};
	}
}
