import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index,
	ManyToOne,
	OneToMany,
	JoinColumn,
	CreateDateColumn,
} from "typeorm";
import { TransactionEntity } from "@/modules/transaction/entities/transaction.entity";
import { LineItemEntity } from "./line-item.entity";
import { CategoryEntity } from "@/modules/category/category.entity";

@Entity("transaction_split")
@Index("idx_split_transaction_id", ["transactionId"])
@Index("idx_split_category_id", ["categoryId"])
export class TransactionSplitEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "transaction_id", type: "uuid" })
	transactionId: string;

	@Column({ name: "category_id", type: "uuid" })
	categoryId: string;

	@Column({ type: "bigint" })
	amount: number;

	@Column({ type: "text", nullable: true })
	memo: string | null;

	@Column({ name: "category_full_name", type: "text" })
	categoryFullName: string;

	@Column({ name: "sort_order", type: "smallint", default: 0 })
	sortOrder: number;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@ManyToOne(
		() => TransactionEntity,
		(transaction) => transaction.splits,
		{
			onDelete: "CASCADE",
		},
	)
	@JoinColumn({ name: "transaction_id" })
	transaction: TransactionEntity;

	@ManyToOne(() => CategoryEntity)
	@JoinColumn({ name: "category_id" })
	category: CategoryEntity;

	@OneToMany(
		() => LineItemEntity,
		(lineItem) => lineItem.split,
		{
			cascade: true,
		},
	)
	lineItems: LineItemEntity[];
}
