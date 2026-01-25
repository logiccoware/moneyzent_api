import { z } from "zod";
import { TransactionType } from "../req";

export const LineItemResDtoSchema = z.object({
	name: z.string(),
	amount: z.number(),
	formattedAmount: z.string(),
	tags: z.array(z.string()),
	memo: z.string().nullable(),
});

export const SplitResDtoSchema = z.object({
	categoryId: z.string(),
	categoryFullName: z.string(),
	amount: z.number(),
	formattedAmount: z.string(),
	memo: z.string().nullable(),
	lineItems: z.array(LineItemResDtoSchema),
});

export const TransactionResDtoSchema = z.object({
	id: z.string(),
	date: z.coerce.date(),
	payeeId: z.string(),
	payeeName: z.string(),
	accountId: z.string(),
	accountName: z.string(),
	currencyCode: z.string(),
	totalAmount: z.number(),
	formattedTotalAmount: z.string(),
	splitCount: z.number(),
	type: TransactionType,
	memo: z.string().nullable(),
	categoryName: z.string().nullable(),
	splits: z.array(SplitResDtoSchema),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const TransactionListResDtoSchema = z.object({
	id: z.string(),
	date: z.coerce.date(),
	payeeId: z.string(),
	payeeName: z.string(),
	accountId: z.string(),
	accountName: z.string(),
	currencyCode: z.string(),
	totalAmount: z.number(),
	formattedTotalAmount: z.string(),
	splitCount: z.number(),
	type: TransactionType,
	memo: z.string().nullable(),
	categoryName: z.string().nullable(),
	splits: z.array(SplitResDtoSchema),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const TransactionsGroupSchema = z.object({
	date: z.string(),
	transactions: z.array(TransactionListResDtoSchema),
});

export const TransactionsGroupedResSchema = z.object({
	transactionsGroup: z.array(TransactionsGroupSchema),
});

export type TLineItemResDto = z.infer<typeof LineItemResDtoSchema>;
export type TSplitResDto = z.infer<typeof SplitResDtoSchema>;
export type TTransactionResDto = z.infer<typeof TransactionResDtoSchema>;
export type TTransactionListResDto = z.infer<
	typeof TransactionListResDtoSchema
>;
export type TTransactionsGroup = z.infer<typeof TransactionsGroupSchema>;
export type TTransactionsGroupedRes = z.infer<
	typeof TransactionsGroupedResSchema
>;
