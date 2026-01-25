import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBetterAuthSchema1767512355836 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE "user" (
        "id" UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL,
        "image" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

		await queryRunner.query(`
      CREATE TABLE "session" (
        "id" UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);

		await queryRunner.query(`
      CREATE TABLE "account" (
        "id" UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMPTZ,
        "refreshTokenExpiresAt" TIMESTAMPTZ,
        "scope" TEXT,
        "password" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
      )
    `);

		await queryRunner.query(`
      CREATE TABLE "verification" (
        "id" UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        "identifier" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

		await queryRunner.query(
			`CREATE INDEX "session_userId_idx" ON "session" ("userId")`,
		);
		await queryRunner.query(
			`CREATE INDEX "account_userId_idx" ON "account" ("userId")`,
		);
		await queryRunner.query(
			`CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier")`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX IF EXISTS "verification_identifier_idx"`,
		);
		await queryRunner.query(`DROP INDEX IF EXISTS "account_userId_idx"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "session_userId_idx"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "verification"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "account"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "session"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
	}
}
