import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnvConfig } from "@/common/config/env.config";

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService<EnvConfig, true>) => ({
				type: "postgres",
				url: configService.get("DATABASE_URL"),
				autoLoadEntities: true,
				synchronize: false,
				logging: configService.get("APP_ENV") === "development",
				poolSize: 1,
				ssl: { rejectUnauthorized: true },
				extra: {
					connectionTimeoutMillis: 10000,
					idleTimeoutMillis: 1000,
					statement_timeout: 30000,
				},
			}),
		}),
	],
})
export class DatabaseModule {}
