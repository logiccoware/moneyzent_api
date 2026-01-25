import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";

config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	max: 1,
	connectionTimeoutMillis: 10000,
	idleTimeoutMillis: 1000,
});

export const auth = betterAuth({
	basePath: "/auth",
	trustedOrigins: [process.env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	database: pool,
	advanced: {
		database: {
			generateId: "uuid",
		},
	},
});
