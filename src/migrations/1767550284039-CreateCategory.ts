import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCategory1767550284039 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE category (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (LENGTH(name) >= 1),
        parent_id UUID REFERENCES category(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        UNIQUE(user_id, full_name)
      )
    `);

		await queryRunner.query(`
      CREATE INDEX idx_category_user_id ON category(user_id) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_category_parent_id ON category(parent_id) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_category_user_parent ON category(user_id, parent_id) WHERE deleted_at IS NULL
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS idx_category_user_parent`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_category_parent_id`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_category_user_id`);
		await queryRunner.query(`DROP TABLE IF EXISTS category`);
	}
}
