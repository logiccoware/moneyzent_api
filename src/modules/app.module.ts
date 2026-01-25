import { randomUUID } from "crypto";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { EnvConfig, validate } from "@/common/config/env.config";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { BaseExceptionFilter } from "@/common/filters/base-exception.filter";
import { auth } from "@/lib/auth";
import { AccountModule } from "@/modules/account/account.module";
import { AppController } from "@/modules/app.controller";
import { AuthModule } from "@/modules/auth/auth.module";
import { CategoryModule } from "@/modules/category/category.module";
import { DatabaseModule } from "@/modules/database/database.module";
import { PayeeModule } from "@/modules/payee/payee.module";
import { ReportModule } from "@/modules/report/report.module";
import { TagModule } from "@/modules/tag/tag.module";
import { TransactionModule } from "@/modules/transaction/transaction.module";

@Module({
	controllers: [AppController],
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
			cache: true,
			validate,
		}),
		// Rate limiting: 100 requests per minute per IP
		ThrottlerModule.forRoot([
			{
				ttl: 60000, // 1 minute in milliseconds
				limit: 100, // 100 requests per minute
			},
		]),
		LoggerModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService<EnvConfig, true>) => {
				const appEnv = configService.get("APP_ENV");
				const isDevelopment = appEnv === "development";
				const isDeployed = appEnv === "production" || appEnv === "staging";

				return {
					pinoHttp: {
						genReqId: (req) =>
							(req.headers["x-request-id"] as string) ||
							(req.headers["x-amzn-trace-id"] as string) ||
							randomUUID(),
						level: isDevelopment ? "debug" : "info",
						// Pretty logs for local dev, JSON for deployed environments
						transport: isDevelopment
							? {
									target: "pino-pretty",
									options: {
										colorize: true,
										singleLine: true,
										translateTime: "SYS:standard",
										ignore: "pid,hostname",
									},
								}
							: undefined,
						serializers: {
							req: (req) => ({
								id: req.id,
								method: req.method,
								url: req.url,
								userId: req.raw?.user?.uid,
							}),
							res: (res) => ({
								statusCode: res.statusCode,
							}),
						},
						// Add Lambda context to logs in deployed environments
						mixin: isDeployed
							? () => ({
									awsRequestId: process.env._X_AMZN_TRACE_ID,
									functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
								})
							: undefined,
						autoLogging: {
							ignore: (req) => req.url === "/health",
						},
						customLogLevel: (_req, res, err) => {
							if (res.statusCode >= 500 || err) return "error";
							if (res.statusCode >= 400) return "warn";
							return "info";
						},
					},
				};
			},
		}),
		AuthModule.forRoot({
			auth,
		}),
		DatabaseModule,
		PayeeModule,
		AccountModule,
		CategoryModule,
		TagModule,
		TransactionModule,
		ReportModule,
	],
	providers: [
		BaseExceptionFilter,
		AllExceptionsFilter,
		// Apply rate limiting globally to all routes
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
	],
})
export class AppModule {}
