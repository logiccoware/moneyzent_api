import { HttpStatus } from "@nestjs/common";

export abstract class BaseException extends Error {
	abstract readonly statusCode: HttpStatus;

	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class EntityNotFound extends BaseException {
	readonly statusCode = HttpStatus.NOT_FOUND;

	constructor(entity: string, id: string) {
		super(`${entity} with id ${id} not found`);
	}
}

export class EntityAlreadyExists extends BaseException {
	readonly statusCode = HttpStatus.CONFLICT;

	constructor(entity: string, identifier: string) {
		super(`${entity} with identifier ${identifier} already exists`);
	}
}

export class InvalidOperation extends BaseException {
	readonly statusCode = HttpStatus.BAD_REQUEST;

	constructor(message: string) {
		super(message);
	}
}

export class Forbidden extends BaseException {
	readonly statusCode = HttpStatus.FORBIDDEN;

	constructor(message = "You do not have permission to perform this action") {
		super(message);
	}
}
