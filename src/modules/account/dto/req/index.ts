import { z } from "zod";

export const CurrencyType = z.enum(["USD", "CAD", "INR"]);

export const AccountCreateDtoReqSchema = z.object({
	name: z.string().min(1, "Name must be at least 1 character long"),
	currencyType: CurrencyType,
});

export const AccountUpdateDtoReqSchema = z.object({
	name: z.string().min(1, "Name must be at least 1 character long"),
	currencyType: CurrencyType,
});

export type TCurrencyType = z.infer<typeof CurrencyType>;
export type TAccountCreateDtoReq = z.infer<typeof AccountCreateDtoReqSchema>;
export type TAccountUpdateDtoReq = z.infer<typeof AccountUpdateDtoReqSchema>;
