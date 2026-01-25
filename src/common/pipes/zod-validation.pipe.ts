import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import { ZodError } from "zod";
import type { ZodSchema } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
	constructor(private schema: ZodSchema) {}

	transform(value: unknown) {
		const result = this.schema.safeParse(value);

		if (!result.success) {
			const errors = this.formatErrors(result.error);
			throw new BadRequestException({
				message: "SCHEMA_VALIDATION_FAILED",
				errors,
			});
		}

		return result.data;
	}

	private formatErrors(error: ZodError): Record<string, string[]> {
		const formatted: Record<string, string[]> = {};
		for (const issue of error.issues) {
			const path = issue.path.join(".") || "root";
			if (!formatted[path]) {
				formatted[path] = [];
			}
			formatted[path].push(issue.message);
		}
		return formatted;
	}
}
