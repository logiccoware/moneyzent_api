import { Injectable } from "@nestjs/common";
import { CurrencyConfig } from "@/common/config/currency.config";
import { TReportQueryDto } from "@/modules/report/dto/req";
import {
	SpendingsCategoriesResDtoSchema,
	SpendingsPayeesResDtoSchema,
	TCategoryTreeChild,
	TCategoryTreeNode,
	TPieChartDataItem,
	TSpendingsCategoriesResDto,
	TSpendingsPayeesResDto,
} from "@/modules/report/dto/res";
import { TransactionEntity } from "@/modules/transaction/entities/transaction.entity";
import { TransactionService } from "@/modules/transaction/transaction.service";

@Injectable()
export class ReportService {
	constructor(private readonly transactionService: TransactionService) {}

	async getSpendingsByPayees(
		userId: string,
		query: TReportQueryDto,
	): Promise<TSpendingsPayeesResDto> {
		const { accountId, startOfMonth, endOfMonth, transactionType } = query;

		const transactions = await this.transactionService.findTransactions({
			userId,
			accountId,
			startDate: startOfMonth,
			endDate: endOfMonth,
			type: transactionType,
		});

		const currencyCode = transactions[0]?.currencyCode ?? "USD";
		const { pieChartData, totalAmount } = this._aggregateByPayee(
			transactions,
			currencyCode,
		);

		return SpendingsPayeesResDtoSchema.parse({
			totalAmount,
			formattedTotalAmount: this._formatAmount(totalAmount, currencyCode),
			pieChartData,
		});
	}

	async getSpendingsByCategories(
		userId: string,
		query: TReportQueryDto,
	): Promise<TSpendingsCategoriesResDto> {
		const { accountId, startOfMonth, endOfMonth, transactionType } = query;

		const transactions = await this.transactionService.findTransactions({
			userId,
			accountId,
			startDate: startOfMonth,
			endDate: endOfMonth,
			type: transactionType,
			includeSplits: true,
		});

		const currencyCode = transactions[0]?.currencyCode ?? "USD";

		const { categoryTree, pieChartData, totalAmount } = this._buildCategoryTree(
			transactions,
			currencyCode,
		);

		return SpendingsCategoriesResDtoSchema.parse({
			categoryTree,
			totalAmount,
			formattedTotalAmount: this._formatAmount(totalAmount, currencyCode),
			pieChartData,
		});
	}

	private _formatAmount(amount: number, currencyCode: string): string {
		const config = CurrencyConfig[currencyCode] ?? CurrencyConfig.CAD;
		const value = Number(amount) / config.divisor;

		return new Intl.NumberFormat(config.locale, {
			style: "currency",
			currency: config.currency,
		}).format(value);
	}

	private _aggregateByPayee(
		transactions: TransactionEntity[],
		currencyCode: string,
	): { pieChartData: TPieChartDataItem[]; totalAmount: number } {
		const config = CurrencyConfig[currencyCode] ?? CurrencyConfig.CAD;
		const payeeMap = new Map<string, { payeeName: string; total: number }>();
		let totalAmount = 0;

		for (const txn of transactions) {
			const amount = Number(txn.totalAmount);
			totalAmount += amount;
			const existing = payeeMap.get(txn.payeeId);
			if (existing) {
				existing.total += amount;
			} else {
				payeeMap.set(txn.payeeId, {
					payeeName: txn.payeeName,
					total: amount,
				});
			}
		}

		// Convert to pie chart data format, sorted by value descending
		const pieChartData: TPieChartDataItem[] = Array.from(payeeMap.values())
			.map((data, index) => ({
				id: index,
				value: data.total / config.divisor,
				label: data.payeeName,
				formattedValue: this._formatAmount(data.total, currencyCode),
			}))
			.sort((a, b) => b.value - a.value)
			.map((item, index) => ({ ...item, id: index })); // Re-index after sorting

		return { pieChartData, totalAmount };
	}

	private _buildCategoryTree(
		transactions: TransactionEntity[],
		currencyCode: string,
	): {
		categoryTree: TCategoryTreeNode[];
		pieChartData: TPieChartDataItem[];
		totalAmount: number;
	} {
		const config = CurrencyConfig[currencyCode] ?? CurrencyConfig.CAD;

		// Map to track parent categories
		const parentMap = new Map<
			string,
			{
				categoryId: string;
				categoryName: string;
				totalAmount: number;
				children: Map<
					string,
					{
						categoryId: string;
						categoryName: string;
						totalAmount: number;
					}
				>;
			}
		>();

		let grandTotal = 0;

		// Process each transaction and its splits
		for (const txn of transactions) {
			for (const split of txn.splits || []) {
				const fullName = split.categoryFullName;
				const parts = fullName.split(":");
				const parentName = parts[0];
				const childName = parts.length > 1 ? parts.slice(1).join(":") : null;
				const amount = Number(split.amount);

				grandTotal += amount;

				// Get or create parent entry
				let parent = parentMap.get(parentName);
				if (!parent) {
					parent = {
						categoryId: split.categoryId,
						categoryName: parentName,
						totalAmount: 0,
						children: new Map(),
					};
					parentMap.set(parentName, parent);
				}

				parent.totalAmount += amount;

				if (childName) {
					// This is a subcategory
					let child = parent.children.get(childName);
					if (!child) {
						child = {
							categoryId: split.categoryId,
							categoryName: childName,
							totalAmount: 0,
						};
						parent.children.set(childName, child);
					}
					child.totalAmount += amount;
				}
			}
		}

		// Convert to tree structure
		const categoryTree: TCategoryTreeNode[] = Array.from(parentMap.values())
			.map((parent) => ({
				categoryId: parent.categoryId,
				categoryName: parent.categoryName,
				totalAmount: parent.totalAmount,
				formattedTotalAmount: this._formatAmount(
					parent.totalAmount,
					currencyCode,
				),
				children: Array.from(parent.children.values())
					.map(
						(child): TCategoryTreeChild => ({
							categoryId: child.categoryId,
							categoryName: child.categoryName,
							totalAmount: child.totalAmount,
							formattedTotalAmount: this._formatAmount(
								child.totalAmount,
								currencyCode,
							),
						}),
					)
					.sort((a, b) => b.totalAmount - a.totalAmount),
			}))
			.sort((a, b) => b.totalAmount - a.totalAmount);

		// Build pie chart data from parent totals
		const pieChartData: TPieChartDataItem[] = categoryTree.map(
			(node, index) => ({
				id: index,
				value: node.totalAmount / config.divisor,
				label: node.categoryName,
				formattedValue: node.formattedTotalAmount,
			}),
		);

		return { categoryTree, pieChartData, totalAmount: grandTotal };
	}
}
