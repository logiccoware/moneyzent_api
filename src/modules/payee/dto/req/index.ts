import { z } from "zod";

export const PayeeCreateDtoReqSchema = z.object({
	name: z.string().min(1, "Name must be at least 1 character long"),
});
export const PayeeUpdateDtoReqSchema = PayeeCreateDtoReqSchema;

export type TPayeeCreateDtoReq = z.infer<typeof PayeeCreateDtoReqSchema>;
export type TPayeeUpdateDtoReq = z.infer<typeof PayeeUpdateDtoReqSchema>;
