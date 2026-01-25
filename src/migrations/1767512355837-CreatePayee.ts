import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePayee1767512355837 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE payee (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (LENGTH(name) >= 1),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        UNIQUE(user_id, name)
      )
    `);

		await queryRunner.query(`
      CREATE INDEX idx_payee_user_id ON payee(user_id) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_payee_user_name ON payee(user_id, name) WHERE deleted_at IS NULL
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS idx_payee_user_name`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_payee_user_id`);
		await queryRunner.query(`DROP TABLE IF EXISTS payee`);
	}
}
