import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import * as compression from "compression";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { BaseExceptionFilter } from "@/common/filters/base-exception.filter";
import { auth } from "@/lib/auth";
import { AppModule } from "@/modules/app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		bufferLogs: true,
		bodyParser: false, // Disable built-in parser to manually control per route
	});

	// Use Pino logger for all NestJS logs
	const logger = app.get(Logger);
	app.useLogger(logger);

	const configService = app.get(ConfigService);

	// Security middleware
	app.use(helmet());

	// Compression middleware for smaller response payloads
	app.use(compression());

	app.enableCors({
		origin: configService.get("CORS_ORIGIN"),
		credentials: true,
	});

	// Handle better-auth routes BEFORE NestJS routing (needs raw body stream)
	app.use("/auth", toNodeHandler(auth));

	// Apply body parsers to all other routes
	app.use(json());
	app.use(urlencoded({ extended: true }));

	// Register exception filters (order matters: catch-all last)
	// Filters are evaluated in reverse order, so AllExceptionsFilter catches unhandled exceptions
	app.useGlobalFilters(
		app.get(AllExceptionsFilter),
		app.get(BaseExceptionFilter),
	);

	// Enable graceful shutdown hooks for proper cleanup on SIGTERM/SIGINT
	app.enableShutdownHooks();

	const port = process.env.PORT ?? 3000;
	await app.listen(port);

	logger.log(`Application running on port ${port}`);
}
bootstrap();
