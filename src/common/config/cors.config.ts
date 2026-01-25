import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

export function getCorsConfig(): CorsOptions {
	// const corsOrigins = process.env.CORS_ORIGINS;
	// const allowedOrigins = corsOrigins.split(',').map((origin) => origin.trim());

	return {
		origin: "*",
		credentials: true,
	};
}
