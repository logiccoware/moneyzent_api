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
} from "@nestjs/common";
import { PayeeService } from "@/modules/payee/payee.service";
import { Session } from "@/modules/auth/decorators/session.decorator";
import { UserSession } from "@/modules/auth/types";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import {
	PayeeCreateDtoReqSchema,
	PayeeUpdateDtoReqSchema,
	TPayeeCreateDtoReq,
	TPayeeUpdateDtoReq,
} from "@/modules/payee/dto/req";

@Controller("payees")
export class PayeeController {
	constructor(private readonly payeeService: PayeeService) {}

	@Get()
	@HttpCode(HttpStatus.OK)
	getPayees(@Session() session: UserSession) {
		return this.payeeService.getLatestPayees(session.user.id);
	}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	async createPayee(
		@Session() session: UserSession,
		@Body(new ZodValidationPipe(PayeeCreateDtoReqSchema))
		dto: TPayeeCreateDtoReq,
	) {
		return await this.payeeService.create(session.user.id, dto);
	}

	@Get(":id")
	getPayee(@Session() session: UserSession, @Param("id") payeeId: string) {
		return this.payeeService.getPayee(session.user.id, payeeId);
	}

	@Patch(":id")
	async updatePayee(
		@Session() session: UserSession,
		@Param("id") payeeId: string,
		@Body(new ZodValidationPipe(PayeeUpdateDtoReqSchema))
		dto: TPayeeUpdateDtoReq,
	) {
		return await this.payeeService.update(session.user.id, payeeId, dto);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	async deletePayee(
		@Session() session: UserSession,
		@Param("id") payeeId: string,
	) {
		return await this.payeeService.delete(session.user.id, payeeId);
	}
}
