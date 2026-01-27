import * as esbuild from "esbuild";

await esbuild.build({
	entryPoints: ["dist/lambda.js"],
	bundle: true,
	platform: "node",
	target: "node24",
	format: "esm",
	outfile: "dist/bundle.mjs",
	external: [
		// AWS SDK is included in Lambda runtime
		"@aws-sdk/*",
		// Native modules
		"pg-native",
		// Optional NestJS dependencies
		"class-transformer",
		"class-validator",
		"@nestjs/websockets",
		"@nestjs/websockets/*",
		"@nestjs/microservices",
		"@nestjs/microservices/*",
	],
	banner: {
		js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`,
	},
});

console.log("Bundle created: dist/bundle.mjs");
