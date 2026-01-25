import { Module } from "@nestjs/common";
import { ReportController } from "@/modules/report/report.controller";
import { ReportService } from "@/modules/report/report.service";
import { TransactionModule } from "@/modules/transaction/transaction.module";

@Module({
	imports: [TransactionModule],
	controllers: [ReportController],
	providers: [ReportService],
	exports: [ReportService],
})
export class ReportModule {}
