import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTransaction1767551263810 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE transaction (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        financial_account_id UUID NOT NULL REFERENCES financial_account(id) ON DELETE RESTRICT,
        payee_id UUID NOT NULL REFERENCES payee(id) ON DELETE RESTRICT,
        date DATE NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME')),
        memo TEXT,
        total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
        split_count SMALLINT NOT NULL CHECK (split_count >= 1),
        account_name TEXT NOT NULL,
        currency_code TEXT NOT NULL,
        payee_name TEXT NOT NULL,
        category_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

		await queryRunner.query(`
      CREATE INDEX idx_transaction_user_id ON transaction(user_id) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_transaction_user_account_date ON transaction(user_id, financial_account_id, date DESC) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_transaction_user_payee_date ON transaction(user_id, payee_id, date DESC) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_transaction_user_type_date ON transaction(user_id, type, date DESC) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_transaction_date ON transaction(date DESC) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_transaction_reports ON transaction(user_id, financial_account_id, type, date DESC) WHERE deleted_at IS NULL
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS idx_transaction_reports`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_transaction_date`);
		await queryRunner.query(
			`DROP INDEX IF EXISTS idx_transaction_user_type_date`,
		);
		await queryRunner.query(
			`DROP INDEX IF EXISTS idx_transaction_user_payee_date`,
		);
		await queryRunner.query(
			`DROP INDEX IF EXISTS idx_transaction_user_account_date`,
		);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_transaction_user_id`);
		await queryRunner.query(`DROP TABLE IF EXISTS transaction`);
	}
}
