import { z } from "zod";
import { TransactionType } from "@/modules/transaction/dto/req";

export const ReportQueryDtoSchema = z.object({
	startOfMonth: z.coerce.date({ message: "startOfMonth must be a valid date" }),
	endOfMonth: z.coerce.date({ message: "endOfMonth must be a valid date" }),
	accountId: z.string().min(1, "accountId is required"),
	transactionType: TransactionType,
	// Future: Add categoryIds filter
	// categoryIds: z.array(z.string()).optional(),
});

export type TReportQueryDto = z.infer<typeof ReportQueryDtoSchema>;
