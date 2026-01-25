import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { BaseEntity } from "@/common/entities";

@Entity("tag")
@Index("idx_tag_user_name_unique", ["userId"], {
	where: '"deleted_at" IS NULL',
})
@Index("idx_tag_user_id", ["userId"], { where: '"deleted_at" IS NULL' })
@Index("idx_tag_user_usage", ["userId", "usageCount"], {
	where: '"deleted_at" IS NULL',
})
export class TagEntity extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "user_id", type: "uuid" })
	userId: string;

	@Column({ type: "text" })
	name: string;

	@Column({ name: "usage_count", type: "integer", default: 0 })
	usageCount: number;
}
