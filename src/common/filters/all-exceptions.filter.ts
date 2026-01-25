import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(AllExceptionsFilter.name);
	}

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		// Handle known HttpExceptions (including NestJS built-in and custom exceptions)
		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			const exceptionResponse = exception.getResponse();
			const message =
				typeof exceptionResponse === "string"
					? exceptionResponse
					: (exceptionResponse as any).message || exception.message;

			// Log client errors at warn level
			if (status >= 400 && status < 500) {
				this.logger.warn(
					{
						statusCode: status,
						userId: (request as any).user?.uid,
						details:
							typeof exceptionResponse === "object" ? exceptionResponse : null,
					},
					`${request.method} ${request.url} - ${
						Array.isArray(message) ? message.join(", ") : message
					}`,
				);
			}

			return response.status(status).json({
				statusCode: status,
				message: Array.isArray(message) ? message.join(", ") : message,
				error: HttpStatus[status] || "Error",
				timestamp: new Date().toISOString(),
				path: request.url,
			});
		}

		// Unhandled errors: log raw error, return generic 500 to client
		this.logger.error(
			{
				err: exception,
				userId: (request as any).user?.uid,
			},
			`${request.method} ${request.url} - ${
				exception instanceof Error ? exception.message : "Unknown error"
			}`,
		);

		response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			message: "Internal server error",
			error: "INTERNAL_SERVER_ERROR",
			timestamp: new Date().toISOString(),
			path: request.url,
		});
	}
}
