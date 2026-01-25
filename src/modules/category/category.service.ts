import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { CategoryEntity } from "@/modules/category/category.entity";
import {
	TCategoryCreateDtoReq,
	TCategoryUpdateDtoReq,
	TSubcategoryCreateDtoReq,
} from "@/modules/category/dto/req";
import {
	TCategoryResDto,
	CategoryResDtoSchema,
	TCategoryTreeResDto,
} from "@/modules/category/dto/res";
import { EntityNotFound, InvalidOperation } from "@/common/exceptions";
import { ENTITY } from "@/common/constants";
import { CategoryTreeTransformer } from "./transformers/category-tree.transformer";

@Injectable()
export class CategoryService {
	constructor(
		@InjectRepository(CategoryEntity)
		private readonly categoryRepository: Repository<CategoryEntity>,
	) {}

	async getCategories(userId: string): Promise<TCategoryResDto[]> {
		const categories = await this.categoryRepository.find({
			where: { userId },
			relations: ["parent"],
			order: { name: "ASC" },
		});

		return categories.map((category) =>
			this._toResDto(
				category.id,
				category.name,
				category.fullName,
				category.parentId,
				category.parent?.name ?? null,
			),
		);
	}

	async getCategory(
		userId: string,
		categoryId: string,
	): Promise<TCategoryResDto> {
		const category = await this.categoryRepository.findOne({
			where: { id: categoryId, userId },
			relations: ["parent"],
		});

		if (!category) {
			throw new EntityNotFound(ENTITY.category, categoryId);
		}

		return this._toResDto(
			category.id,
			category.name,
			category.fullName,
			category.parentId,
			category.parent?.name ?? null,
		);
	}

	async getCategoriesTree(userId: string): Promise<TCategoryTreeResDto[]> {
		const categories = await this.categoryRepository.find({
			where: { userId },
			order: { name: "ASC" },
		});

		const categoryDocs = categories.map((category) => ({
			id: category.id,
			name: category.name,
			parentId: category.parentId,
		}));

		return CategoryTreeTransformer.transform(categoryDocs);
	}

	async create(
		userId: string,
		dto: TCategoryCreateDtoReq,
	): Promise<TCategoryResDto> {
		const fullName = dto.name.toLowerCase();

		const category = this.categoryRepository.create({
			userId,
			name: dto.name,
			parentId: null,
			fullName,
		});

		const saved = await this.categoryRepository.save(category);

		return this._toResDto(saved.id, saved.name, saved.fullName, null, null);
	}

	async createSubcategory(
		userId: string,
		dto: TSubcategoryCreateDtoReq,
	): Promise<TCategoryResDto> {
		const parent = await this.categoryRepository.findOne({
			where: { id: dto.parentId, userId },
		});

		if (!parent) {
			throw new EntityNotFound(ENTITY.category, dto.parentId);
		}

		// Enforce max 2-level nesting
		if (parent.parentId !== null) {
			throw new InvalidOperation("Cannot create subcategory of a subcategory");
		}

		const fullName = `${parent.name}:${dto.name}`.toLowerCase();

		const category = this.categoryRepository.create({
			userId,
			name: dto.name,
			parentId: dto.parentId,
			fullName,
		});

		const saved = await this.categoryRepository.save(category);

		return this._toResDto(
			saved.id,
			saved.name,
			saved.fullName,
			dto.parentId,
			parent.name,
		);
	}

	async update(
		userId: string,
		categoryId: string,
		dto: TCategoryUpdateDtoReq,
	): Promise<TCategoryResDto> {
		const category = await this.categoryRepository.findOne({
			where: { id: categoryId, userId },
			relations: ["parent"],
		});

		if (!category) {
			throw new EntityNotFound(ENTITY.category, categoryId);
		}

		category.name = dto.name;

		// Update fullName based on whether it's a parent or child
		if (category.parentId === null) {
			category.fullName = dto.name.toLowerCase();
		} else {
			category.fullName = `${category.parent?.name}:${dto.name}`.toLowerCase();
		}

		await this.categoryRepository.save(category);

		// If this is a parent category, update fullName in all subcategories
		if (category.parentId === null) {
			const subcategories = await this.categoryRepository.find({
				where: { userId, parentId: categoryId },
			});

			for (const subcategory of subcategories) {
				subcategory.fullName = `${dto.name}:${subcategory.name}`.toLowerCase();
				await this.categoryRepository.save(subcategory);
			}
		}

		return this._toResDto(
			category.id,
			category.name,
			category.fullName,
			category.parentId,
			category.parent?.name ?? null,
		);
	}

	async delete(userId: string, categoryId: string): Promise<void> {
		const category = await this.categoryRepository.findOne({
			where: { id: categoryId, userId },
		});

		if (!category) {
			throw new EntityNotFound(ENTITY.category, categoryId);
		}

		// Soft delete - CASCADE will handle subcategories via DB constraint
		await this.categoryRepository.softDelete(categoryId);

		// Also soft delete subcategories if this is a parent
		if (category.parentId === null) {
			await this.categoryRepository.softDelete({
				userId,
				parentId: categoryId,
			});
		}
	}

	private _toResDto(
		id: string,
		name: string,
		fullName: string,
		parentId: string | null,
		parentName: string | null,
	): TCategoryResDto {
		return CategoryResDtoSchema.parse({
			id,
			name,
			fullName,
			parentId,
			parentName,
		});
	}
}
