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
import { AccountService } from "@/modules/account/account.service";
import { Session } from "@/modules/auth/decorators/session.decorator";
import { UserSession } from "@/modules/auth/types";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import {
	AccountCreateDtoReqSchema,
	AccountUpdateDtoReqSchema,
	TAccountCreateDtoReq,
	TAccountUpdateDtoReq,
} from "@/modules/account/dto/req";

@Controller("accounts")
export class AccountController {
	constructor(private readonly accountService: AccountService) {}

	@Get()
	getAccounts(@Session() session: UserSession) {
		return this.accountService.getAccounts(session.user.id);
	}

	@Get(":id")
	getAccount(@Session() session: UserSession, @Param("id") accountId: string) {
		return this.accountService.getAccount(session.user.id, accountId);
	}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	createAccount(
		@Session() session: UserSession,
		@Body(new ZodValidationPipe(AccountCreateDtoReqSchema))
		dto: TAccountCreateDtoReq,
	) {
		return this.accountService.create(session.user.id, dto);
	}

	@Patch(":id")
	updateAccount(
		@Session() session: UserSession,
		@Param("id") accountId: string,
		@Body(new ZodValidationPipe(AccountUpdateDtoReqSchema))
		dto: TAccountUpdateDtoReq,
	) {
		return this.accountService.update(session.user.id, accountId, dto);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	deleteAccount(
		@Session() session: UserSession,
		@Param("id") accountId: string,
	) {
		return this.accountService.delete(session.user.id, accountId);
	}
}
