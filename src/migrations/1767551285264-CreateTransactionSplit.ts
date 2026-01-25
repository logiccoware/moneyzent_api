import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTransactionSplit1767551285264 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE transaction_split (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES category(id) ON DELETE RESTRICT,
        amount BIGINT NOT NULL CHECK (amount > 0),
        memo TEXT,
        category_full_name TEXT NOT NULL,
        sort_order SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

		await queryRunner.query(`
      CREATE INDEX idx_split_transaction_id ON transaction_split(transaction_id)
    `);

		await queryRunner.query(`
      CREATE INDEX idx_split_category_id ON transaction_split(category_id)
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS idx_split_category_id`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_split_transaction_id`);
		await queryRunner.query(`DROP TABLE IF EXISTS transaction_split`);
	}
}
