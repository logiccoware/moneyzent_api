import { z } from "zod";

export const PayeeResDtoSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
});
export type TPayeeResDto = z.infer<typeof PayeeResDtoSchema>;
