import { z } from "zod";

export const CategoryCreateDtoReqSchema = z.object({
	name: z.string().min(1, "Name must be at least 1 character long"),
});

export const CategoryUpdateDtoReqSchema = CategoryCreateDtoReqSchema;

export const SubcategoryCreateDtoReqSchema = z.object({
	name: z.string().min(1, "Name must be at least 1 character long"),
	parentId: z.string().min(1, "Parent ID is required"),
});

export type TCategoryCreateDtoReq = z.infer<typeof CategoryCreateDtoReqSchema>;
export type TCategoryUpdateDtoReq = z.infer<typeof CategoryUpdateDtoReqSchema>;
export type TSubcategoryCreateDtoReq = z.infer<
	typeof SubcategoryCreateDtoReqSchema
>;
