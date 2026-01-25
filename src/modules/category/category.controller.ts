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
import { CategoryService } from "@/modules/category/category.service";
import { Session } from "@/modules/auth/decorators/session.decorator";
import { UserSession } from "@/modules/auth/types";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import {
	CategoryCreateDtoReqSchema,
	CategoryUpdateDtoReqSchema,
	SubcategoryCreateDtoReqSchema,
	TCategoryCreateDtoReq,
	TCategoryUpdateDtoReq,
	TSubcategoryCreateDtoReq,
} from "@/modules/category/dto/req";

@Controller("categories")
export class CategoryController {
	constructor(private readonly categoryService: CategoryService) {}

	@Get()
	getCategories(@Session() session: UserSession) {
		return this.categoryService.getCategories(session.user.id);
	}

	@Get("tree")
	getCategoriesTree(@Session() session: UserSession) {
		return this.categoryService.getCategoriesTree(session.user.id);
	}

	@Get(":id")
	getCategory(
		@Session() session: UserSession,
		@Param("id") categoryId: string,
	) {
		return this.categoryService.getCategory(session.user.id, categoryId);
	}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	createCategory(
		@Session() session: UserSession,
		@Body(new ZodValidationPipe(CategoryCreateDtoReqSchema))
		dto: TCategoryCreateDtoReq,
	) {
		return this.categoryService.create(session.user.id, dto);
	}

	@Post("subcategory")
	@HttpCode(HttpStatus.CREATED)
	createSubcategory(
		@Session() session: UserSession,
		@Body(new ZodValidationPipe(SubcategoryCreateDtoReqSchema))
		dto: TSubcategoryCreateDtoReq,
	) {
		return this.categoryService.createSubcategory(session.user.id, dto);
	}

	@Patch(":id")
	updateCategory(
		@Session() session: UserSession,
		@Param("id") categoryId: string,
		@Body(new ZodValidationPipe(CategoryUpdateDtoReqSchema))
		dto: TCategoryUpdateDtoReq,
	) {
		return this.categoryService.update(session.user.id, categoryId, dto);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	deleteCategory(
		@Session() session: UserSession,
		@Param("id") categoryId: string,
	) {
		return this.categoryService.delete(session.user.id, categoryId);
	}
}
