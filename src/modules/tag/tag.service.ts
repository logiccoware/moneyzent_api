import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { TagEntity } from "@/modules/tag/tag.entity";
import { TTagCreateDtoReq, TTagUpdateDtoReq } from "@/modules/tag/dto/req";
import { TTagResDto, TagResDtoSchema } from "@/modules/tag/dto/res";
import { EntityNotFound } from "@/common/exceptions";
import { ENTITY } from "@/common/constants";

@Injectable()
export class TagService {
	constructor(
		@InjectRepository(TagEntity)
		private readonly tagRepository: Repository<TagEntity>,
	) {}

	async getTags(userId: string): Promise<TTagResDto[]> {
		const tags = await this.tagRepository.find({
			where: { userId },
			order: { usageCount: "DESC" },
		});

		return tags.map((tag) => this._toResDto(tag.id, tag.name, tag.usageCount));
	}

	async getTag(userId: string, tagId: string): Promise<TTagResDto> {
		const tag = await this.tagRepository.findOne({
			where: { id: tagId, userId },
		});

		if (!tag) {
			throw new EntityNotFound(ENTITY.tag, tagId);
		}

		return this._toResDto(tag.id, tag.name, tag.usageCount);
	}

	async create(userId: string, dto: TTagCreateDtoReq): Promise<TTagResDto> {
		const tag = this.tagRepository.create({
			userId,
			name: dto.name.toLowerCase(),
			usageCount: 0,
		});

		const saved = await this.tagRepository.save(tag);

		return this._toResDto(saved.id, saved.name, saved.usageCount);
	}

	async findOrCreate(userId: string, tagName: string): Promise<TagEntity> {
		const normalizedName = tagName.toLowerCase();

		let tag = await this.tagRepository.findOne({
			where: { userId, name: normalizedName },
		});

		if (!tag) {
			tag = this.tagRepository.create({
				userId,
				name: normalizedName,
				usageCount: 0,
			});
			tag = await this.tagRepository.save(tag);
		}

		return tag;
	}

	async findOrCreateMany(
		userId: string,
		tagNames: string[],
	): Promise<TagEntity[]> {
		if (tagNames.length === 0) return [];

		const uniqueNames = [...new Set(tagNames.map((n) => n.toLowerCase()))];
		const tags: TagEntity[] = [];

		for (const name of uniqueNames) {
			const tag = await this.findOrCreate(userId, name);
			tags.push(tag);
		}

		return tags;
	}

	async update(
		userId: string,
		tagId: string,
		dto: TTagUpdateDtoReq,
	): Promise<TTagResDto> {
		const tag = await this.tagRepository.findOne({
			where: { id: tagId, userId },
		});

		if (!tag) {
			throw new EntityNotFound(ENTITY.tag, tagId);
		}

		tag.name = dto.name.toLowerCase();
		const updated = await this.tagRepository.save(tag);

		return this._toResDto(updated.id, updated.name, updated.usageCount);
	}

	async delete(userId: string, tagId: string): Promise<void> {
		const tag = await this.tagRepository.findOne({
			where: { id: tagId, userId },
		});

		if (!tag) {
			throw new EntityNotFound(ENTITY.tag, tagId);
		}

		await this.tagRepository.softDelete(tagId);
	}

	private _toResDto(id: string, name: string, usageCount: number): TTagResDto {
		return TagResDtoSchema.parse({
			id,
			name,
			usageCount,
		});
	}
}
