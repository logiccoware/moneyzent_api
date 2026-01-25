import { z } from "zod";

export const TagCreateDtoReqSchema = z.object({
	name: z.string().min(1, "Name is required").max(50, "Name too long"),
});

export const TagUpdateDtoReqSchema = TagCreateDtoReqSchema;

export type TTagCreateDtoReq = z.infer<typeof TagCreateDtoReqSchema>;
export type TTagUpdateDtoReq = z.infer<typeof TagUpdateDtoReqSchema>;
