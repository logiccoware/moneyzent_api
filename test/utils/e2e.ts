import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { AppModule } from "../../src/modules/app.module";
import { AUTH_OPTIONS } from "../../src/modules/auth/types";
import { AllExceptionsFilter } from "../../src/common/filters/all-exceptions.filter";
import { BaseExceptionFilter } from "../../src/common/filters/base-exception.filter";

export interface E2eContext {
	app: INestApplication;
	dataSource: DataSource;
	userId: string;
	session: { user: { id: string; role: string[] } };
}

export async function createE2eContext(): Promise<E2eContext> {
	const userId = randomUUID();
	const session = { user: { id: userId, role: [] } };

	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [AppModule],
	})
		.overrideProvider(AUTH_OPTIONS)
		.useValue({
			auth: {
				api: {
					getSession: jest.fn().mockResolvedValue(session),
				},
			},
		})
		.compile();

	const app = moduleFixture.createNestApplication();
	app.useGlobalFilters(
		app.get(AllExceptionsFilter),
		app.get(BaseExceptionFilter),
	);
	await app.init();

	const dataSource = app.get(DataSource);
	await dataSource.query(
		`
      INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
    `,
		[userId, "E2E User", `e2e-${userId}@example.com`, true],
	);

	return { app, dataSource, userId, session };
}

export async function destroyE2eContext(context: E2eContext) {
	await context.dataSource.query(`DELETE FROM payee WHERE user_id = $1`, [
		context.userId,
	]);
	await context.dataSource.query(`DELETE FROM "user" WHERE id = $1`, [
		context.userId,
	]);
	await context.app.close();
}
