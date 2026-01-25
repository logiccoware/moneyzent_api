import { config } from "dotenv";
import { DataSource } from "typeorm";

config();

const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
	type: "postgres",
	url: process.env.DATABASE_URL,
	entities: isProduction ? ["dist/**/*.entity.js"] : ["src/**/*.entity.ts"],
	migrations: isProduction ? ["dist/migrations/*.js"] : ["src/migrations/*.ts"],
	synchronize: false,
	logging: !isProduction,
});
