import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";
import { BaseException } from "@/common/exceptions";

@Catch(BaseException)
export class BaseExceptionFilter implements ExceptionFilter {
	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(BaseExceptionFilter.name);
	}

	catch(exception: BaseException, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();
		const statusCode = exception.statusCode;

		// Log the exception with context
		this.logger.warn(
			{
				statusCode,
				userId: (request as any).user?.uid,
			},
			`${request.method} ${request.url} - ${exception.message}`,
		);

		response.status(statusCode).json({
			statusCode,
			message: exception.message,
			error: HttpStatus[statusCode],
			timestamp: new Date().toISOString(),
			path: request.url,
		});
	}
}
