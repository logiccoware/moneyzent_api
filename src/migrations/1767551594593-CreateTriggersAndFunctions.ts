import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTriggersAndFunctions1767551594593
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Function: Update transaction totals when splits change
		await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_transaction_totals()
      RETURNS TRIGGER AS $$
      DECLARE
        txn_id UUID;
        new_total BIGINT;
        new_count SMALLINT;
        new_category_name TEXT;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          txn_id = OLD.transaction_id;
        ELSE
          txn_id = NEW.transaction_id;
        END IF;

        SELECT
          COALESCE(SUM(amount), 0),
          COALESCE(COUNT(*), 0)::SMALLINT
        INTO new_total, new_count
        FROM transaction_split
        WHERE transaction_id = txn_id;

        SELECT
          CASE
            WHEN COUNT(DISTINCT SPLIT_PART(category_full_name, ':', 1)) = 1
            THEN MAX(SPLIT_PART(category_full_name, ':', 1))
            ELSE STRING_AGG(DISTINCT SPLIT_PART(category_full_name, ':', 1), ', ')
          END
        INTO new_category_name
        FROM transaction_split
        WHERE transaction_id = txn_id;

        UPDATE transaction
        SET
          total_amount = new_total,
          split_count = GREATEST(new_count, 1),
          category_name = new_category_name
        WHERE id = txn_id;

        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

		// Trigger: Update transaction totals on split changes
		await queryRunner.query(`
      CREATE TRIGGER trg_split_totals
      AFTER INSERT OR UPDATE OR DELETE ON transaction_split
      FOR EACH ROW EXECUTE FUNCTION update_transaction_totals()
    `);

		// Function: Update tag usage count
		await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_tag_usage_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE tag SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE tag SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

		// Trigger: Track tag usage on line_item_tag changes
		await queryRunner.query(`
      CREATE TRIGGER trg_tag_usage
      AFTER INSERT OR DELETE ON line_item_tag
      FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count()
    `);

		// Function: Cascade payee name updates to transactions
		await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cascade_payee_name_update()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.name <> NEW.name THEN
          UPDATE transaction
          SET payee_name = NEW.name
          WHERE payee_id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

		// Trigger: Cascade payee name to transactions
		await queryRunner.query(`
      CREATE TRIGGER trg_cascade_payee_name
      AFTER UPDATE ON payee
      FOR EACH ROW EXECUTE FUNCTION cascade_payee_name_update()
    `);

		// Function: Cascade account name updates to transactions
		await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cascade_account_name_update()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.name <> NEW.name THEN
          UPDATE transaction
          SET account_name = NEW.name
          WHERE financial_account_id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

		// Trigger: Cascade account name to transactions
		await queryRunner.query(`
      CREATE TRIGGER trg_cascade_account_name
      AFTER UPDATE ON financial_account
      FOR EACH ROW EXECUTE FUNCTION cascade_account_name_update()
    `);

		// Function: Cascade category full_name updates to transaction_splits
		await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cascade_category_fullname_update()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.full_name <> NEW.full_name THEN
          UPDATE transaction_split
          SET category_full_name = NEW.full_name
          WHERE category_id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

		// Trigger: Cascade category full_name to transaction_splits
		await queryRunner.query(`
      CREATE TRIGGER trg_cascade_category_fullname
      AFTER UPDATE ON category
      FOR EACH ROW EXECUTE FUNCTION cascade_category_fullname_update()
    `);

		// Function: Cascade parent category name to subcategories' full_name
		await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cascade_category_name_update()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.name <> NEW.name THEN
          UPDATE category
          SET full_name = LOWER(NEW.name || ':' || name)
          WHERE parent_id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

		// Trigger: Cascade parent category name to subcategories
		await queryRunner.query(`
      CREATE TRIGGER trg_cascade_category_name
      AFTER UPDATE ON category
      FOR EACH ROW EXECUTE FUNCTION cascade_category_name_update()
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP TRIGGER IF EXISTS trg_cascade_category_name ON category`,
		);
		await queryRunner.query(
			`DROP FUNCTION IF EXISTS cascade_category_name_update`,
		);
		await queryRunner.query(
			`DROP TRIGGER IF EXISTS trg_cascade_category_fullname ON category`,
		);
		await queryRunner.query(
			`DROP FUNCTION IF EXISTS cascade_category_fullname_update`,
		);
		await queryRunner.query(
			`DROP TRIGGER IF EXISTS trg_cascade_account_name ON financial_account`,
		);
		await queryRunner.query(
			`DROP FUNCTION IF EXISTS cascade_account_name_update`,
		);
		await queryRunner.query(
			`DROP TRIGGER IF EXISTS trg_cascade_payee_name ON payee`,
		);
		await queryRunner.query(
			`DROP FUNCTION IF EXISTS cascade_payee_name_update`,
		);
		await queryRunner.query(
			`DROP TRIGGER IF EXISTS trg_tag_usage ON line_item_tag`,
		);
		await queryRunner.query(`DROP FUNCTION IF EXISTS update_tag_usage_count`);
		await queryRunner.query(
			`DROP TRIGGER IF EXISTS trg_split_totals ON transaction_split`,
		);
		await queryRunner.query(
			`DROP FUNCTION IF EXISTS update_transaction_totals`,
		);
	}
}
