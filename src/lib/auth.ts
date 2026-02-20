import { betterAuth } from "better-auth";
import { config } from "dotenv";
import { Pool } from "pg";

config();

const connectionTimeoutMillis = 10000;
const idleTimeoutMillis = 30000;
const parsedPoolSize = Number.parseInt(
	process.env.DATABASE_POOL_SIZE ?? "10",
	10,
);
const maxPoolSize =
	Number.isFinite(parsedPoolSize) && parsedPoolSize > 0 ? parsedPoolSize : 10;

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	max: maxPoolSize,
	connectionTimeoutMillis,
	idleTimeoutMillis,
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
