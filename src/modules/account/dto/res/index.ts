import { z } from "zod";
import { CurrencyType } from "../req";

export const AccountResDtoSchema = z.object({
	id: z.string(),
	name: z.string(),
	currencyType: CurrencyType,
});

export type TAccountResDto = z.infer<typeof AccountResDtoSchema>;
