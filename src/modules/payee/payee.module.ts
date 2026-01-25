import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PayeeController } from "@/modules/payee/payee.controller";
import { PayeeService } from "@/modules/payee/payee.service";
import { PayeeEntity } from "@/modules/payee/payee.entity";

@Module({
	imports: [TypeOrmModule.forFeature([PayeeEntity])],
	controllers: [PayeeController],
	providers: [PayeeService],
	exports: [PayeeService],
})
export class PayeeModule {}
