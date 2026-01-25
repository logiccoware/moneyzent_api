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
import { TagService } from "@/modules/tag/tag.service";
import { Session } from "@/modules/auth/decorators/session.decorator";
import { UserSession } from "@/modules/auth/types";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import {
	TagCreateDtoReqSchema,
	TagUpdateDtoReqSchema,
	TTagCreateDtoReq,
	TTagUpdateDtoReq,
} from "@/modules/tag/dto/req";

@Controller("tags")
export class TagController {
	constructor(private readonly tagService: TagService) {}

	@Get()
	getTags(@Session() session: UserSession) {
		return this.tagService.getTags(session.user.id);
	}

	@Get(":id")
	getTag(@Session() session: UserSession, @Param("id") tagId: string) {
		return this.tagService.getTag(session.user.id, tagId);
	}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	createTag(
		@Session() session: UserSession,
		@Body(new ZodValidationPipe(TagCreateDtoReqSchema)) dto: TTagCreateDtoReq,
	) {
		return this.tagService.create(session.user.id, dto);
	}

	@Patch(":id")
	updateTag(
		@Session() session: UserSession,
		@Param("id") tagId: string,
		@Body(new ZodValidationPipe(TagUpdateDtoReqSchema)) dto: TTagUpdateDtoReq,
	) {
		return this.tagService.update(session.user.id, tagId, dto);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	deleteTag(@Session() session: UserSession, @Param("id") tagId: string) {
		return this.tagService.delete(session.user.id, tagId);
	}
}
