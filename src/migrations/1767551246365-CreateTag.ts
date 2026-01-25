import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTag1767551246365 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE tag (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 50),
        usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

		// Case-insensitive unique constraint
		await queryRunner.query(`
      CREATE UNIQUE INDEX idx_tag_user_name_unique ON tag(user_id, LOWER(name)) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_tag_user_id ON tag(user_id) WHERE deleted_at IS NULL
    `);

		await queryRunner.query(`
      CREATE INDEX idx_tag_user_usage ON tag(user_id, usage_count DESC) WHERE deleted_at IS NULL
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS idx_tag_user_usage`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_tag_user_id`);
		await queryRunner.query(`DROP INDEX IF EXISTS idx_tag_user_name_unique`);
		await queryRunner.query(`DROP TABLE IF EXISTS tag`);
	}
}
