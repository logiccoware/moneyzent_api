import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { config } from "dotenv";

config();

export const auth = betterAuth({
	basePath: "/auth",
	trustedOrigins: [process.env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	database: new Pool({
		connectionString: process.env.DATABASE_URL,
	}),
	advanced: {
		database: {
			generateId: "uuid",
		},
	},
});
