// src/instrumentation.ts
// Loaded via --require before NestJS boots.
// No @/ aliases or NestJS imports allowed here.

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";

const appEnv = process.env.APP_ENV;
const otelEnabled = process.env.OTEL_ENABLED === "true";

if (otelEnabled || appEnv === "prod") {
	// SDK reads OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT,
	// OTEL_EXPORTER_OTLP_HEADERS, OTEL_EXPORTER_OTLP_PROTOCOL automatically.
	const sdk = new NodeSDK({
		instrumentations: [
			getNodeAutoInstrumentations({
				// fs instrumentation is extremely noisy; disable it
				"@opentelemetry/instrumentation-fs": { enabled: false },
			}),
		],
	});

	sdk.start();

	// Cloud Run sends SIGTERM — flush spans before exit
	process.on("SIGTERM", () => {
		sdk.shutdown().finally(() => process.exit(0));
	});
}
