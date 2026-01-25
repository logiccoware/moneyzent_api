import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFinancialAccount1767549310393 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE financial_account (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (LENGTH(name) >= 1),
        currency_type TEXT NOT NULL CHECK (currency_type IN ('USD', 'CAD', 'INR')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        UNIQUE(user_id, name)
      )
    `);

		await queryRunner.query(`
      CREATE INDEX idx_financial_account_user_id ON financial_account(user_id) WHERE deleted_at IS NULL
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX IF EXISTS idx_financial_account_user_id`,
		);
		await queryRunner.query(`DROP TABLE IF EXISTS financial_account`);
	}
}
