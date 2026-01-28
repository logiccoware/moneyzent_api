import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, DataSource, Repository } from "typeorm";
import { CurrencyConfig } from "@/common/config/currency.config";
import { ENTITY } from "@/common/constants";
import { EntityNotFound, InvalidOperation } from "@/common/exceptions";
import { AccountService } from "@/modules/account/account.service";
import { CategoryService } from "@/modules/category/category.service";
import { PayeeService } from "@/modules/payee/payee.service";
import { TagService } from "@/modules/tag/tag.service";
import {
	TSplitDto,
	TTransactionCreateDtoReq,
	TTransactionType,
	TTransactionUpdateDtoReq,
} from "@/modules/transaction/dto/req";
import {
	TransactionListResDtoSchema,
	TransactionResDtoSchema,
	TransactionsGroupedResSchema,
	TTransactionListResDto,
	TTransactionResDto,
	TTransactionsGroupedRes,
} from "@/modules/transaction/dto/res";
import {
	LineItemEntity,
	TransactionEntity,
	TransactionSplitEntity,
} from "@/modules/transaction/entities";

export interface FindTransactionsOptions {
	userId: string;
	accountId: string;
	startDate: Date;
	endDate: Date;
	type?: TTransactionType;
	includeSplits?: boolean;
}

@Injectable()
export class TransactionService {
	constructor(
		@InjectRepository(TransactionEntity)
		private readonly transactionRepository: Repository<TransactionEntity>,
		private readonly dataSource: DataSource,
		private readonly payeeService: PayeeService,
		private readonly categoryService: CategoryService,
		private readonly accountService: AccountService,
		private readonly tagService: TagService,
	) {}

	async findTransactions(
		options: FindTransactionsOptions,
	): Promise<TransactionEntity[]> {
		const { userId, accountId, startDate, endDate, type, includeSplits } =
			options;

		return this.transactionRepository.find({
			where: {
				userId,
				financialAccountId: accountId,
				date: Between(startDate, endDate),
				...(type && { type }),
			},
			relations: includeSplits
				? ["splits", "splits.lineItems", "splits.lineItems.tags"]
				: [],
			order: { date: "DESC" },
		});
	}

	async getTransactionsFilter(
		userId: string,
		accountId: string,
		startOfMonth: Date,
		endOfMonth: Date,
	): Promise<TTransactionsGroupedRes> {
		const transactions = await this.findTransactions({
			userId,
			accountId,
			startDate: startOfMonth,
			endDate: endOfMonth,
			includeSplits: true,
		});

		const listDtos = transactions.map((txn) => this._toListResDto(txn));
		return this._groupTransactionsByDate(listDtos);
	}

	async getLatestTransactionByPayee(
		userId: string,
		accountId: string,
		payeeId: string,
	): Promise<TTransactionListResDto | null> {
		const transaction = await this.transactionRepository.findOne({
			where: { userId, financialAccountId: accountId, payeeId },
			relations: ["splits", "splits.lineItems", "splits.lineItems.tags"],
			order: { date: "DESC" },
		});

		if (!transaction) {
			return null;
		}

		return this._toListResDto(transaction);
	}

	async getTransactionsByAccount(
		userId: string,
		accountId: string,
	): Promise<TTransactionListResDto[]> {
		const transactions = await this.transactionRepository.find({
			where: { userId, financialAccountId: accountId },
			relations: ["splits", "splits.lineItems", "splits.lineItems.tags"],
			order: { date: "DESC" },
		});

		return transactions.map((txn) => this._toListResDto(txn));
	}

	async getTransaction(
		userId: string,
		transactionId: string,
	): Promise<TTransactionResDto> {
		const transaction = await this.transactionRepository.findOne({
			where: { id: transactionId, userId },
			relations: ["splits", "splits.lineItems", "splits.lineItems.tags"],
		});

		if (!transaction) {
			throw new EntityNotFound(ENTITY.transaction, transactionId);
		}

		return this._toResDto(transaction);
	}

	async create(
		userId: string,
		dto: TTransactionCreateDtoReq,
	): Promise<TTransactionResDto> {
		this._validateSplitAmounts(dto.splits);

		const [payee, account] = await Promise.all([
			this.payeeService.getPayee(userId, dto.payeeId),
			this.accountService.getAccount(userId, dto.accountId),
		]);

		const totalAmount = this._calculateTotalAmount(dto.splits);

		return await this.dataSource.transaction(async (manager) => {
			// Create transaction
			const transaction = manager.create(TransactionEntity, {
				userId,
				date: dto.date,
				payeeId: dto.payeeId,
				payeeName: payee.name,
				financialAccountId: dto.accountId,
				accountName: account.name,
				currencyCode: account.currencyType,
				totalAmount,
				splitCount: dto.splits.length,
				type: dto.type,
				memo: dto.memo ?? null,
				categoryName: null, // Will be updated by trigger
			});

			const savedTransaction = await manager.save(transaction);

			// Create splits and line items
			for (let i = 0; i < dto.splits.length; i++) {
				const splitDto = dto.splits[i];
				const category = await this.categoryService.getCategory(
					userId,
					splitDto.categoryId,
				);

				const split = manager.create(TransactionSplitEntity, {
					transactionId: savedTransaction.id,
					categoryId: splitDto.categoryId,
					categoryFullName: category.fullName,
					amount: splitDto.amount,
					memo: splitDto.memo ?? null,
					sortOrder: i,
				});

				const savedSplit = await manager.save(split);

				// Create line items
				for (let j = 0; j < splitDto.lineItems.length; j++) {
					const lineItemDto = splitDto.lineItems[j];

					const lineItem = manager.create(LineItemEntity, {
						splitId: savedSplit.id,
						name: lineItemDto.name,
						amount: lineItemDto.amount,
						memo: lineItemDto.memo ?? null,
						sortOrder: j,
					});

					const savedLineItem = await manager.save(lineItem);

					// Handle tags
					if (lineItemDto.tags.length > 0) {
						const tags = await this.tagService.findOrCreateMany(
							userId,
							lineItemDto.tags,
						);
						savedLineItem.tags = tags;
						await manager.save(savedLineItem);
					}
				}
			}

			// Reload with relations
			const result = await manager.findOne(TransactionEntity, {
				where: { id: savedTransaction.id },
				relations: ["splits", "splits.lineItems", "splits.lineItems.tags"],
			});

			if (!result) {
				throw new Error(
					`Transaction ${savedTransaction.id} was created but could not be reloaded`,
				);
			}

			return this._toResDto(result);
		});
	}

	async update(
		userId: string,
		transactionId: string,
		dto: TTransactionUpdateDtoReq,
	): Promise<TTransactionResDto> {
		const transaction = await this.transactionRepository.findOne({
			where: { id: transactionId, userId },
			relations: ["splits", "splits.lineItems", "splits.lineItems.tags"],
		});

		if (!transaction) {
			throw new EntityNotFound(ENTITY.transaction, transactionId);
		}

		return await this.dataSource.transaction(async (manager) => {
			if (dto.date) {
				transaction.date = dto.date;
			}

			if (dto.payeeId) {
				const payee = await this.payeeService.getPayee(userId, dto.payeeId);
				transaction.payeeId = dto.payeeId;
				transaction.payeeName = payee.name;
			}

			if (dto.accountId) {
				const account = await this.accountService.getAccount(
					userId,
					dto.accountId,
				);
				transaction.financialAccountId = dto.accountId;
				transaction.accountName = account.name;
				transaction.currencyCode = account.currencyType;
			}

			if (dto.type) {
				transaction.type = dto.type;
			}

			if (dto.memo) {
				transaction.memo = dto.memo;
			}

			if (dto.splits) {
				this._validateSplitAmounts(dto.splits);
				const createdSplits: TransactionSplitEntity[] = [];

				// Delete existing splits (cascade will delete line items and tags)
				await manager.delete(TransactionSplitEntity, {
					transactionId: transaction.id,
				});

				transaction.totalAmount = this._calculateTotalAmount(dto.splits);
				transaction.splitCount = dto.splits.length;

				// Create new splits
				for (let i = 0; i < dto.splits.length; i++) {
					const splitDto = dto.splits[i];
					const category = await this.categoryService.getCategory(
						userId,
						splitDto.categoryId,
					);

					const split = manager.create(TransactionSplitEntity, {
						transactionId: transaction.id,
						categoryId: splitDto.categoryId,
						categoryFullName: category.fullName,
						amount: splitDto.amount,
						memo: splitDto.memo ?? null,
						sortOrder: i,
					});

					const savedSplit = await manager.save(split);
					createdSplits.push(savedSplit);

					for (let j = 0; j < splitDto.lineItems.length; j++) {
						const lineItemDto = splitDto.lineItems[j];

						const lineItem = manager.create(LineItemEntity, {
							splitId: savedSplit.id,
							name: lineItemDto.name,
							amount: lineItemDto.amount,
							memo: lineItemDto.memo ?? null,
							sortOrder: j,
						});

						const savedLineItem = await manager.save(lineItem);

						if (lineItemDto.tags.length > 0) {
							const tags = await this.tagService.findOrCreateMany(
								userId,
								lineItemDto.tags,
							);
							savedLineItem.tags = tags;
							await manager.save(savedLineItem);
						}
					}
				}

				// Keep relation state aligned with the new splits to avoid nulling FKs.
				transaction.splits = createdSplits;
			}

			await manager.save(transaction);

			// Reload with relations
			const result = await manager.findOne(TransactionEntity, {
				where: { id: transaction.id },
				relations: ["splits", "splits.lineItems", "splits.lineItems.tags"],
			});

			if (!result) {
				throw new Error(
					`Transaction ${transaction.id} was updated but could not be reloaded`,
				);
			}

			return this._toResDto(result);
		});
	}

	async delete(userId: string, transactionId: string): Promise<void> {
		const transaction = await this.transactionRepository.findOne({
			where: { id: transactionId, userId },
		});

		if (!transaction) {
			throw new EntityNotFound(ENTITY.transaction, transactionId);
		}

		await this.transactionRepository.softDelete(transactionId);
	}

	private _formatAmount(amount: number, currencyCode: string): string {
		const config = CurrencyConfig[currencyCode] ?? CurrencyConfig.USD;
		const value = Number(amount) / config.divisor;

		return new Intl.NumberFormat(config.locale, {
			style: "currency",
			currency: config.currency,
		}).format(value);
	}

	private _calculateTotalAmount(splits: TSplitDto[]): number {
		return splits.reduce((sum, split) => sum + split.amount, 0);
	}

	private _validateSplitAmounts(splits: TSplitDto[]): void {
		for (const split of splits) {
			if (split.lineItems.length > 0) {
				const lineItemsTotal = split.lineItems.reduce(
					(sum, item) => sum + item.amount,
					0,
				);
				if (lineItemsTotal !== split.amount) {
					throw new InvalidOperation(
						`Split amount (${split.amount}) does not match sum of line items (${lineItemsTotal})`,
					);
				}
			}
		}
	}

	private _toResDto(transaction: TransactionEntity): TTransactionResDto {
		const currencyCode = transaction.currencyCode;

		const splits = (transaction.splits || [])
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((split) => ({
				categoryId: split.categoryId,
				categoryFullName: split.categoryFullName,
				amount: Number(split.amount),
				formattedAmount: this._formatAmount(split.amount, currencyCode),
				memo: split.memo,
				lineItems: (split.lineItems || [])
					.sort((a, b) => a.sortOrder - b.sortOrder)
					.map((item) => ({
						name: item.name,
						amount: Number(item.amount),
						formattedAmount: this._formatAmount(item.amount, currencyCode),
						tags: (item.tags || []).map((tag) => tag.name),
						memo: item.memo,
					})),
			}));

		return TransactionResDtoSchema.parse({
			id: transaction.id,
			date: transaction.date,
			payeeId: transaction.payeeId,
			payeeName: transaction.payeeName,
			accountId: transaction.financialAccountId,
			accountName: transaction.accountName,
			currencyCode,
			totalAmount: Number(transaction.totalAmount),
			formattedTotalAmount: this._formatAmount(
				transaction.totalAmount,
				currencyCode,
			),
			splitCount: transaction.splitCount,
			type: transaction.type,
			memo: transaction.memo,
			categoryName: transaction.categoryName,
			splits,
			createdAt: transaction.createdAt,
			updatedAt: transaction.updatedAt,
		});
	}

	private _toListResDto(
		transaction: TransactionEntity,
	): TTransactionListResDto {
		return TransactionListResDtoSchema.parse(this._toResDto(transaction));
	}

	private _groupTransactionsByDate(
		transactions: TTransactionListResDto[],
	): TTransactionsGroupedRes {
		const groupedMap = new Map<string, TTransactionListResDto[]>();

		for (const transaction of transactions) {
			const dateKey = new Date(transaction.date).toISOString().split("T")[0];
			const existing = groupedMap.get(dateKey) || [];
			existing.push(transaction);
			groupedMap.set(dateKey, existing);
		}

		const transactionsGroup = Array.from(groupedMap.entries()).map(
			([date, txns]) => ({
				date,
				transactions: txns,
			}),
		);

		return TransactionsGroupedResSchema.parse({ transactionsGroup });
	}
}
