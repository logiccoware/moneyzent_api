import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TPayeeResDto, PayeeResDtoSchema } from "@/modules/payee/dto/res";
import { PayeeEntity } from "@/modules/payee/payee.entity";
import {
	TPayeeCreateDtoReq,
	TPayeeUpdateDtoReq,
} from "@/modules/payee/dto/req";
import { EntityNotFound } from "@/common/exceptions";
import { ENTITY } from "@/common/constants";

@Injectable()
export class PayeeService {
	constructor(
		@InjectRepository(PayeeEntity)
		private readonly payeeRepository: Repository<PayeeEntity>,
	) {}

	async getLatestPayees(userId: string): Promise<TPayeeResDto[]> {
		const payees = await this.payeeRepository.find({
			where: { userId },
			order: { name: "ASC" },
		});

		return payees.map((payee) =>
			PayeeResDtoSchema.parse({
				id: payee.id,
				name: payee.name,
			}),
		);
	}

	async create(userId: string, dto: TPayeeCreateDtoReq): Promise<TPayeeResDto> {
		const payee = this.payeeRepository.create({
			userId,
			name: dto.name,
		});

		const saved = await this.payeeRepository.save(payee);

		return PayeeResDtoSchema.parse({
			id: saved.id,
			name: saved.name,
		});
	}

	async getPayee(userId: string, payeeId: string): Promise<TPayeeResDto> {
		const payee = await this.payeeRepository.findOne({
			where: { id: payeeId, userId },
		});

		if (!payee) {
			throw new EntityNotFound(ENTITY.payee, payeeId);
		}

		return PayeeResDtoSchema.parse({
			id: payee.id,
			name: payee.name,
		});
	}

	async update(
		userId: string,
		payeeId: string,
		dto: TPayeeUpdateDtoReq,
	): Promise<TPayeeResDto> {
		const payee = await this.payeeRepository.findOne({
			where: { id: payeeId, userId },
		});

		if (!payee) {
			throw new EntityNotFound(ENTITY.payee, payeeId);
		}

		payee.name = dto.name;
		const updated = await this.payeeRepository.save(payee);

		return PayeeResDtoSchema.parse({
			id: updated.id,
			name: updated.name,
		});
	}

	async delete(userId: string, payeeId: string): Promise<void> {
		const payee = await this.payeeRepository.findOne({
			where: { id: payeeId, userId },
		});

		if (!payee) {
			throw new EntityNotFound(ENTITY.payee, payeeId);
		}

		await this.payeeRepository.softDelete(payeeId);
	}
}
