import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import * as compression from "compression";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { setupSwagger } from "@/common/config/swagger.config";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { BaseExceptionFilter } from "@/common/filters/base-exception.filter";
import { auth } from "@/lib/auth";
import { AppModule } from "@/modules/app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		bufferLogs: true,
		bodyParser: false,
	});

	const logger = app.get(Logger);
	app.useLogger(logger);

	const configService = app.get(ConfigService);

	app.use(helmet());
	app.use(compression());

	app.enableCors({
		origin: configService.get("CORS_ORIGIN"),
		credentials: true,
	});

	// Parse request bodies before handing off to better-auth.
	// Middleware order matters: if `/auth` is mounted first, req.body will be undefined.
	app.use(json());
	app.use(urlencoded({ extended: true }));
	app.use("/auth", toNodeHandler(auth));

	setupSwagger(app);

	app.useGlobalFilters(
		app.get(AllExceptionsFilter),
		app.get(BaseExceptionFilter),
	);

	const port = process.env.PORT ?? 3000;
	await app.listen(port);

	logger.log(`Server running on http://localhost:${port}`);
}

bootstrap();
