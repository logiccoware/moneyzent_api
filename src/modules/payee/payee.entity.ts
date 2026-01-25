import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from "typeorm";
import { BaseEntity } from "@/common/entities";

@Entity("payee")
@Unique(["userId", "name"])
@Index("idx_payee_user_id", ["userId"], { where: '"deleted_at" IS NULL' })
@Index("idx_payee_user_name", ["userId", "name"], {
	where: '"deleted_at" IS NULL',
})
export class PayeeEntity extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "user_id", type: "uuid" })
	userId: string;

	@Column({ type: "text" })
	name: string;
}
