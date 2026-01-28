import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";

export function setupSwagger(app: INestApplication): void {
	if (process.env.SWAGGER_ENABLED !== "true") {
		return;
	}

	const swaggerUser = process.env.SWAGGER_BASIC_AUTH_USER ?? "";
	const swaggerPass = process.env.SWAGGER_BASIC_AUTH_PASS ?? "";

	const swaggerAuthMiddleware = (
		request: Request,
		response: Response,
		next: NextFunction,
	) => {
		const authHeader = request.headers.authorization ?? "";
		const [type, encoded] = authHeader.split(" ");

		if (type === "Basic" && encoded) {
			const decoded = Buffer.from(encoded, "base64").toString("utf8");
			const [user, pass] = decoded.split(":");

			if (user === swaggerUser && pass === swaggerPass) {
				return next();
			}
		}

		response.setHeader("WWW-Authenticate", 'Basic realm="Swagger"');
		response.status(401).send("Unauthorized");
	};

	if (swaggerUser && swaggerPass) {
		app.use("/docs", swaggerAuthMiddleware);
		app.use("/docs-json", swaggerAuthMiddleware);
	}

	const config = new DocumentBuilder()
		.setTitle("Moneyzent API")
		.setDescription("Moneyzent API documentation")
		.setVersion("1.0")
		.build();

	const document = SwaggerModule.createDocument(app, config);

	SwaggerModule.setup("docs", app, document, {
		jsonDocumentUrl: "docs-json",
	});
}
