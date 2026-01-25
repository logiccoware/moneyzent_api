import { z } from "zod";

// ============== Pie Chart ==============

export const PieChartDataItemSchema = z.object({
	id: z.number(),
	value: z.number(),
	label: z.string(),
	formattedValue: z.string(),
});

export type TPieChartDataItem = z.infer<typeof PieChartDataItemSchema>;

// ============== Spendings by Payees ==============

export const SpendingsPayeesResDtoSchema = z.object({
	totalAmount: z.number(),
	formattedTotalAmount: z.string(),
	pieChartData: z.array(PieChartDataItemSchema),
});

export type TSpendingsPayeesResDto = z.infer<
	typeof SpendingsPayeesResDtoSchema
>;

// ============== Spendings by Categories ==============

// Child category node (subcategory)
export const CategoryTreeChildSchema = z.object({
	categoryId: z.string(),
	categoryName: z.string(),
	totalAmount: z.number(),
	formattedTotalAmount: z.string(),
});

// Parent category node (top-level category with subcategories)
export const CategoryTreeNodeSchema = z.object({
	categoryId: z.string(),
	categoryName: z.string(),
	totalAmount: z.number(),
	formattedTotalAmount: z.string(),
	children: z.array(CategoryTreeChildSchema),
});

export const SpendingsCategoriesResDtoSchema = z.object({
	categoryTree: z.array(CategoryTreeNodeSchema),
	totalAmount: z.number(),
	formattedTotalAmount: z.string(),
	pieChartData: z.array(PieChartDataItemSchema),
});

export type TCategoryTreeChild = z.infer<typeof CategoryTreeChildSchema>;
export type TCategoryTreeNode = z.infer<typeof CategoryTreeNodeSchema>;
export type TSpendingsCategoriesResDto = z.infer<
	typeof SpendingsCategoriesResDtoSchema
>;
