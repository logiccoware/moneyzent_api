import { Injectable } from "@nestjs/common";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { CurrentUserSchema } from "@/common/schema/currentUser.schema";

@Injectable()
export class CurrentUserValidationPipe extends ZodValidationPipe {
	constructor() {
		super(CurrentUserSchema);
	}
}
