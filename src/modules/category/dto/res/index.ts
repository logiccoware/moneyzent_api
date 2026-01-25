import { z } from "zod";

export const CategoryResDtoSchema = z.object({
	id: z.string(),
	name: z.string(),
	fullName: z.string(),
	parentId: z.string().nullable(),
	parentName: z.string().nullable(),
});

export type TCategoryResDto = z.infer<typeof CategoryResDtoSchema>;

export const CategoryTreeChildSchema = z.object({
	id: z.string(),
	label: z.string(),
});

export const CategoryTreeResDtoSchema = z.object({
	id: z.string(),
	label: z.string(),
	children: z.array(CategoryTreeChildSchema),
});

export type TCategoryTreeChild = z.infer<typeof CategoryTreeChildSchema>;
export type TCategoryTreeResDto = z.infer<typeof CategoryTreeResDtoSchema>;
