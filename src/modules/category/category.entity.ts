import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	Index,
	Unique,
	ManyToOne,
	OneToMany,
	JoinColumn,
} from "typeorm";
import { BaseEntity } from "@/common/entities";

@Entity("category")
@Unique(["userId", "fullName"])
@Index("idx_category_user_id", ["userId"], { where: '"deleted_at" IS NULL' })
@Index("idx_category_parent_id", ["parentId"], {
	where: '"deleted_at" IS NULL',
})
@Index("idx_category_user_parent", ["userId", "parentId"], {
	where: '"deleted_at" IS NULL',
})
export class CategoryEntity extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "user_id", type: "uuid" })
	userId: string;

	@Column({ type: "text" })
	name: string;

	@Column({ name: "parent_id", type: "uuid", nullable: true })
	parentId: string | null;

	@Column({ name: "full_name", type: "text" })
	fullName: string;

	@ManyToOne(
		() => CategoryEntity,
		(category) => category.children,
		{
			onDelete: "CASCADE",
		},
	)
	@JoinColumn({ name: "parent_id" })
	parent: CategoryEntity | null;

	@OneToMany(
		() => CategoryEntity,
		(category) => category.parent,
	)
	children: CategoryEntity[];
}
