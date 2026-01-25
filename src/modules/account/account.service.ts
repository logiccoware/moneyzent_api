import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FinancialAccountEntity } from "@/modules/account/account.entity";
import {
	TAccountCreateDtoReq,
	TAccountUpdateDtoReq,
} from "@/modules/account/dto/req";
import { TAccountResDto, AccountResDtoSchema } from "@/modules/account/dto/res";
import { EntityNotFound } from "@/common/exceptions";
import { ENTITY } from "@/common/constants";

@Injectable()
export class AccountService {
	constructor(
		@InjectRepository(FinancialAccountEntity)
		private readonly accountRepository: Repository<FinancialAccountEntity>,
	) {}

	async getAccounts(userId: string): Promise<TAccountResDto[]> {
		const accounts = await this.accountRepository.find({
			where: { userId },
			order: { name: "ASC" },
		});

		return accounts.map((account) =>
			AccountResDtoSchema.parse({
				id: account.id,
				name: account.name,
				currencyType: account.currencyType,
			}),
		);
	}

	async getAccount(userId: string, accountId: string): Promise<TAccountResDto> {
		const account = await this.accountRepository.findOne({
			where: { id: accountId, userId },
		});

		if (!account) {
			throw new EntityNotFound(ENTITY.account, accountId);
		}

		return AccountResDtoSchema.parse({
			id: account.id,
			name: account.name,
			currencyType: account.currencyType,
		});
	}

	async create(
		userId: string,
		dto: TAccountCreateDtoReq,
	): Promise<TAccountResDto> {
		const account = this.accountRepository.create({
			userId,
			name: dto.name,
			currencyType: dto.currencyType,
		});

		const saved = await this.accountRepository.save(account);

		return AccountResDtoSchema.parse({
			id: saved.id,
			name: saved.name,
			currencyType: saved.currencyType,
		});
	}

	async update(
		userId: string,
		accountId: string,
		dto: TAccountUpdateDtoReq,
	): Promise<TAccountResDto> {
		const account = await this.accountRepository.findOne({
			where: { id: accountId, userId },
		});

		if (!account) {
			throw new EntityNotFound(ENTITY.account, accountId);
		}

		account.name = dto.name;
		account.currencyType = dto.currencyType;
		const updated = await this.accountRepository.save(account);

		return AccountResDtoSchema.parse({
			id: updated.id,
			name: updated.name,
			currencyType: updated.currencyType,
		});
	}

	async delete(userId: string, accountId: string): Promise<void> {
		const account = await this.accountRepository.findOne({
			where: { id: accountId, userId },
		});

		if (!account) {
			throw new EntityNotFound(ENTITY.account, accountId);
		}

		await this.accountRepository.softDelete(accountId);
	}
}
