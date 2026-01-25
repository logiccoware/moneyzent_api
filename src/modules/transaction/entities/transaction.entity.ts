import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index,
	OneToMany,
	ManyToOne,
	JoinColumn,
} from "typeorm";
import { BaseEntity } from "@/common/entities";
import { TransactionSplitEntity } from "@/modules/transaction/entities/transaction-split.entity";
import { FinancialAccountEntity } from "@/modules/account/account.entity";
import { PayeeEntity } from "@/modules/payee/payee.entity";

export type TransactionType = "EXPENSE" | "INCOME";

@Entity("transaction")
@Index("idx_transaction_user_id", ["userId"], { where: '"deleted_at" IS NULL' })
@Index(
	"idx_transaction_user_account_date",
	["userId", "financialAccountId", "date"],
	{
		where: '"deleted_at" IS NULL',
	},
)
@Index("idx_transaction_user_payee_date", ["userId", "payeeId", "date"], {
	where: '"deleted_at" IS NULL',
})
@Index("idx_transaction_user_type_date", ["userId", "type", "date"], {
	where: '"deleted_at" IS NULL',
})
@Index("idx_transaction_date", ["date"], { where: '"deleted_at" IS NULL' })
export class TransactionEntity extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "user_id", type: "uuid" })
	userId: string;

	@Column({ name: "financial_account_id", type: "uuid" })
	financialAccountId: string;

	@Column({ name: "payee_id", type: "uuid" })
	payeeId: string;

	@Column({ type: "date" })
	date: Date;

	@Column({ type: "text" })
	type: TransactionType;

	@Column({ type: "text", nullable: true })
	memo: string | null;

	@Column({ name: "total_amount", type: "bigint" })
	totalAmount: number;

	@Column({ name: "split_count", type: "smallint" })
	splitCount: number;

	@Column({ name: "account_name", type: "text" })
	accountName: string;

	@Column({ name: "currency_code", type: "text" })
	currencyCode: string;

	@Column({ name: "payee_name", type: "text" })
	payeeName: string;

	@Column({ name: "category_name", type: "text", nullable: true })
	categoryName: string | null;

	@ManyToOne(() => FinancialAccountEntity)
	@JoinColumn({ name: "financial_account_id" })
	financialAccount: FinancialAccountEntity;

	@ManyToOne(() => PayeeEntity)
	@JoinColumn({ name: "payee_id" })
	payee: PayeeEntity;

	@OneToMany(
		() => TransactionSplitEntity,
		(split) => split.transaction,
		{
			cascade: true,
		},
	)
	splits: TransactionSplitEntity[];
}
