import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index,
	ManyToOne,
	ManyToMany,
	JoinColumn,
	JoinTable,
	CreateDateColumn,
} from "typeorm";
import { TransactionSplitEntity } from "./transaction-split.entity";
import { TagEntity } from "@/modules/tag/tag.entity";

@Entity("line_item")
@Index("idx_line_item_split_id", ["splitId"])
export class LineItemEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "split_id", type: "uuid" })
	splitId: string;

	@Column({ type: "text" })
	name: string;

	@Column({ type: "bigint" })
	amount: number;

	@Column({ type: "text", nullable: true })
	memo: string | null;

	@Column({ name: "sort_order", type: "smallint", default: 0 })
	sortOrder: number;

	@CreateDateColumn({ name: "created_at", type: "timestamptz" })
	createdAt: Date;

	@ManyToOne(
		() => TransactionSplitEntity,
		(split) => split.lineItems,
		{
			onDelete: "CASCADE",
		},
	)
	@JoinColumn({ name: "split_id" })
	split: TransactionSplitEntity;

	@ManyToMany(() => TagEntity)
	@JoinTable({
		name: "line_item_tag",
		joinColumn: { name: "line_item_id", referencedColumnName: "id" },
		inverseJoinColumn: { name: "tag_id", referencedColumnName: "id" },
	})
	tags: TagEntity[];
}
