import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLineItemTag1767551313635 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE line_item_tag (
        line_item_id UUID NOT NULL REFERENCES line_item(id) ON DELETE CASCADE,
        tag_id UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
        PRIMARY KEY (line_item_id, tag_id)
      )
    `);

		await queryRunner.query(`
      CREATE INDEX idx_line_item_tag_tag_id ON line_item_tag(tag_id)
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS idx_line_item_tag_tag_id`);
		await queryRunner.query(`DROP TABLE IF EXISTS line_item_tag`);
	}
}
