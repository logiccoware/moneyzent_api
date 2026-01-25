import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionController } from "@/modules/transaction/transaction.controller";
import { TransactionService } from "@/modules/transaction/transaction.service";
import { TransactionEntity } from "@/modules/transaction/entities/transaction.entity";
import { TransactionSplitEntity } from "@/modules/transaction/entities/transaction-split.entity";
import { LineItemEntity } from "@/modules/transaction/entities/line-item.entity";
import { PayeeModule } from "@/modules/payee/payee.module";
import { CategoryModule } from "@/modules/category/category.module";
import { AccountModule } from "@/modules/account/account.module";
import { TagModule } from "@/modules/tag/tag.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([
			TransactionEntity,
			TransactionSplitEntity,
			LineItemEntity,
		]),
		PayeeModule,
		CategoryModule,
		AccountModule,
		TagModule,
	],
	controllers: [TransactionController],
	providers: [TransactionService],
	exports: [TransactionService],
})
export class TransactionModule {}
