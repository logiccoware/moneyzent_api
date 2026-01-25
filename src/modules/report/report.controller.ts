import { Controller, Get, Query } from "@nestjs/common";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { Session } from "@/modules/auth/decorators/session.decorator";
import { UserSession } from "@/modules/auth/types";
import {
	ReportQueryDtoSchema,
	TReportQueryDto,
} from "@/modules/report/dto/req";
import { ReportService } from "@/modules/report/report.service";

@Controller("reports")
export class ReportController {
	constructor(private readonly reportService: ReportService) {}

	@Get("spendings/payees")
	getSpendingsByPayees(
		@Session() session: UserSession,
		@Query(new ZodValidationPipe(ReportQueryDtoSchema))
		query: TReportQueryDto,
	) {
		return this.reportService.getSpendingsByPayees(session.user.id, query);
	}

	@Get("spendings/categories")
	getSpendingsByCategories(
		@Session() session: UserSession,
		@Query(new ZodValidationPipe(ReportQueryDtoSchema))
		query: TReportQueryDto,
	) {
		return this.reportService.getSpendingsByCategories(session.user.id, query);
	}
}
