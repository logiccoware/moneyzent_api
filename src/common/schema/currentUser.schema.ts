import { z } from "zod";

export const CurrentUserSchema = z.object({
	uid: z.string().min(1),
	email: z.string().optional(),
});
export type TCurrentUser = z.infer<typeof CurrentUserSchema>;
