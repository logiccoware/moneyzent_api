import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnvConfig } from "@/common/config/env.config";

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService<EnvConfig, true>) => {
				const connectionTimeoutMillis = 10000;
				const idleTimeoutMillis = 30000;

				return {
					type: "postgres",
					url: configService.get("DATABASE_URL"),
					autoLoadEntities: true,
					synchronize: false,
					logging: configService.get("APP_ENV") === "development",
					poolSize: configService.get("DATABASE_POOL_SIZE"),
					ssl: { rejectUnauthorized: true },
					extra: {
						connectionTimeoutMillis,
						idleTimeoutMillis,
						statement_timeout: 30000,
					},
				};
			},
		}),
	],
})
export class DatabaseModule {}
