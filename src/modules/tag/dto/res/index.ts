import { z } from "zod";

export const TagResDtoSchema = z.object({
	id: z.string(),
	name: z.string(),
	usageCount: z.number(),
});

export type TTagResDto = z.infer<typeof TagResDtoSchema>;
