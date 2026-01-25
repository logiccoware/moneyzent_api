import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
} from "@nestjs/common";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { Session } from "@/modules/auth/decorators/session.decorator";
import { UserSession } from "@/modules/auth/types";
import {
	TransactionCreateDtoReqSchema,
	TransactionLatestQueryDtoSchema,
	TransactionQueryDtoSchema,
	TransactionUpdateDtoReqSchema,
	TTransactionCreateDtoReq,
	TTransactionLatestQueryDto,
	TTransactionQueryDto,
	TTransactionUpdateDtoReq,
} from "@/modules/transaction/dto/req";
import { TransactionService } from "@/modules/transaction/transaction.service";

@Controller("transactions")
export class TransactionController {
	constructor(private readonly transactionService: TransactionService) {}

	@Get("filter")
	getTransactionsFilter(
		@Session() session: UserSession,
		@Query(new ZodValidationPipe(TransactionQueryDtoSchema))
		query: TTransactionQueryDto,
	) {
		return this.transactionService.getTransactionsFilter(
			session.user.id,
			query.accountId,
			query.startOfMonth,
			query.endOfMonth,
		);
	}

	@Get("latest")
	getLatestTransactionByPayee(
		@Session() session: UserSession,
		@Query(new ZodValidationPipe(TransactionLatestQueryDtoSchema))
		query: TTransactionLatestQueryDto,
	) {
		return this.transactionService.getLatestTransactionByPayee(
			session.user.id,
			query.accountId,
			query.payeeId,
		);
	}

	@Get(":id")
	getTransaction(
		@Session() session: UserSession,
		@Param("id") transactionId: string,
	) {
		return this.transactionService.getTransaction(
			session.user.id,
			transactionId,
		);
	}

	@Post()
	createTransaction(
		@Session() session: UserSession,
		@Body(new ZodValidationPipe(TransactionCreateDtoReqSchema))
		dto: TTransactionCreateDtoReq,
	) {
		return this.transactionService.create(session.user.id, dto);
	}

	@Patch(":id")
	updateTransaction(
		@Session() session: UserSession,
		@Param("id") transactionId: string,
		@Body(new ZodValidationPipe(TransactionUpdateDtoReqSchema))
		dto: TTransactionUpdateDtoReq,
	) {
		return this.transactionService.update(session.user.id, transactionId, dto);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	deleteTransaction(
		@Session() session: UserSession,
		@Param("id") transactionId: string,
	) {
		return this.transactionService.delete(session.user.id, transactionId);
	}
}
