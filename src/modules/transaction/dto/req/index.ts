import { z } from "zod";

export const TransactionType = z.enum(["EXPENSE", "INCOME"]);

export const LineItemDtoSchema = z.object({
	name: z.string().min(1, "Name is required"),
	amount: z.number().int().positive("Amount must be positive"),
	tags: z.array(z.string()).default([]),
	memo: z.string().optional(),
});

export const SplitDtoSchema = z.object({
	categoryId: z.string().min(1, "Category ID is required"),
	amount: z.number().int().positive("Amount must be positive"),
	memo: z.string().nullable().optional(),
	lineItems: z.array(LineItemDtoSchema).default([]),
});

export const TransactionCreateDtoReqSchema = z.object({
	date: z.coerce.date(),
	payeeId: z.string().min(1, "Payee ID is required"),
	accountId: z.string().min(1, "Account ID is required"),
	type: TransactionType,
	memo: z.string().nullable().optional(),
	splits: z.array(SplitDtoSchema).min(1, "At least one split is required"),
});

export const TransactionUpdateDtoReqSchema = z.object({
	date: z.coerce.date().optional(),
	payeeId: z.string().min(1).optional(),
	accountId: z.string().min(1).optional(),
	type: TransactionType.optional(),
	memo: z.string().nullable().optional(),
	splits: z.array(SplitDtoSchema).min(1).optional(),
});

export const TransactionQueryDtoSchema = z.object({
	startOfMonth: z.coerce.date({ message: "startOfMonth must be a valid date" }),
	endOfMonth: z.coerce.date({ message: "endOfMonth must be a valid date" }),
	accountId: z.string().min(1, "accountId is required"),
});

export const TransactionLatestQueryDtoSchema = z.object({
	accountId: z.string().min(1, "accountId is required"),
	payeeId: z.string().min(1, "payeeId is required"),
});

export type TTransactionQueryDto = z.infer<typeof TransactionQueryDtoSchema>;
export type TTransactionLatestQueryDto = z.infer<
	typeof TransactionLatestQueryDtoSchema
>;
export type TTransactionType = z.infer<typeof TransactionType>;
export type TLineItemDto = z.infer<typeof LineItemDtoSchema>;
export type TSplitDto = z.infer<typeof SplitDtoSchema>;
export type TTransactionCreateDtoReq = z.infer<
	typeof TransactionCreateDtoReqSchema
>;
export type TTransactionUpdateDtoReq = z.infer<
	typeof TransactionUpdateDtoReqSchema
>;
