import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from "typeorm";
import { BaseEntity } from "@/common/entities";

export type CurrencyType = "USD" | "CAD" | "INR";

@Entity("financial_account")
@Unique(["userId", "name"])
@Index("idx_financial_account_user_id", ["userId"], {
	where: '"deleted_at" IS NULL',
})
export class FinancialAccountEntity extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "user_id", type: "uuid" })
	userId: string;

	@Column({ type: "text" })
	name: string;

	@Column({ name: "currency_type", type: "text" })
	currencyType: CurrencyType;
}
