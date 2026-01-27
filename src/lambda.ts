import { configure as serverlessExpress } from "@codegenie/serverless-express";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import type { Handler } from "aws-lambda";
import { toNodeHandler } from "better-auth/node";
import * as compression from "compression";
import * as express from "express";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { BaseExceptionFilter } from "@/common/filters/base-exception.filter";
import { auth } from "@/lib/auth";
import { AppModule } from "@/modules/app.module";

let cachedServer: Handler;

async function bootstrap(): Promise<Handler> {
	if (cachedServer) {
		return cachedServer;
	}

	const expressApp = express();
	const adapter = new ExpressAdapter(expressApp);

	const app = await NestFactory.create(AppModule, adapter, {
		bufferLogs: true,
		bodyParser: false,
	});

	const logger = app.get(Logger);
	app.useLogger(logger);

	app.use(helmet());
	app.use(compression());
	// CORS is handled by the Lambda Function URL `FunctionUrlConfig.Cors`.
	// Enabling CORS here would result in duplicate `Access-Control-Allow-Origin` headers.

	app.use("/auth", toNodeHandler(auth));
	app.use(json());
	app.use(urlencoded({ extended: true }));

	app.useGlobalFilters(
		app.get(AllExceptionsFilter),
		app.get(BaseExceptionFilter),
	);

	await app.init();

	cachedServer = serverlessExpress({ app: expressApp });
	return cachedServer;
}

export const handler: Handler = async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false;

	const server = await bootstrap();
	return server(event, context, () => {});
};
