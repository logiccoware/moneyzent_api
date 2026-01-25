import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountController } from "@/modules/account/account.controller";
import { AccountService } from "@/modules/account/account.service";
import { FinancialAccountEntity } from "@/modules/account/account.entity";

@Module({
	imports: [TypeOrmModule.forFeature([FinancialAccountEntity])],
	controllers: [AccountController],
	providers: [AccountService],
	exports: [AccountService],
})
export class AccountModule {}
