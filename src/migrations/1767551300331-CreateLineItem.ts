import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLineItem1767551300331 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE line_item (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        split_id UUID NOT NULL REFERENCES transaction_split(id) ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (LENGTH(name) >= 1),
        amount BIGINT NOT NULL CHECK (amount > 0),
        memo TEXT,
        sort_order SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

		await queryRunner.query(`
      CREATE INDEX idx_line_item_split_id ON line_item(split_id)
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS idx_line_item_split_id`);
		await queryRunner.query(`DROP TABLE IF EXISTS line_item`);
	}
}
