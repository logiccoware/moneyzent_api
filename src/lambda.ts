import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { configure as serverlessExpress } from "@codegenie/serverless-express";
import { ConfigService } from "@nestjs/config";
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
let secretsLoaded = false;

async function loadSecrets(): Promise<void> {
	if (secretsLoaded) return;

	const environment = process.env.APP_ENV;

	if (environment !== "prod" && environment !== "staging") {
		throw new Error(
			`Invalid APP_ENV: ${environment}. Must be "prod" or "staging".`,
		);
	}

	const secretName = `${environment}/moneyzent/api`;

	const client = new SecretsManagerClient({});
	const command = new GetSecretValueCommand({ SecretId: secretName });
	const response = await client.send(command);

	if (response.SecretString) {
		const secrets = JSON.parse(response.SecretString);

		// Set secrets as environment variables
		process.env.DATABASE_URL = secrets.DATABASE_URL;
		process.env.BETTER_AUTH_SECRET = secrets.BETTER_AUTH_SECRET;
		process.env.BETTER_AUTH_URL = secrets.BETTER_AUTH_URL;
	}

	secretsLoaded = true;
}

async function bootstrap(): Promise<Handler> {
	if (cachedServer) {
		return cachedServer;
	}

	// Load secrets before initializing the app
	await loadSecrets();

	const expressApp = express();
	const adapter = new ExpressAdapter(expressApp);

	const app = await NestFactory.create(AppModule, adapter, {
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
