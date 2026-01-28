import * as request from "supertest";
import {
	createE2eContext,
	destroyE2eContext,
	type E2eContext,
} from "./utils/e2e";

describe("Payee (e2e)", () => {
	let context: E2eContext;
	let app: E2eContext["app"];
	let userId: string;
	let payeeId: string;

	beforeAll(async () => {
		context = await createE2eContext();
		app = context.app;
		userId = context.userId;
	});

	afterAll(async () => {
		await destroyE2eContext(context);
	});

	it("creates a payee", async () => {
		const response = await request(app.getHttpServer())
			.post("/payees")
			.send({ name: "Coffee Shop" })
			.expect(201);

		expect(response.body).toEqual({
			id: expect.any(String),
			name: "Coffee Shop",
		});
		payeeId = response.body.id;
	});

	it("lists payees for the user", async () => {
		const response = await request(app.getHttpServer())
			.get("/payees")
			.expect(200);

		expect(response.body).toEqual(
			expect.arrayContaining([{ id: payeeId, name: "Coffee Shop" }]),
		);
	});

	it("fetches a single payee", async () => {
		const response = await request(app.getHttpServer())
			.get(`/payees/${payeeId}`)
			.expect(200);

		expect(response.body).toEqual({ id: payeeId, name: "Coffee Shop" });
	});

	it("updates a payee", async () => {
		const response = await request(app.getHttpServer())
			.patch(`/payees/${payeeId}`)
			.send({ name: "New Coffee Shop" })
			.expect(200);

		expect(response.body).toEqual({ id: payeeId, name: "New Coffee Shop" });
	});

	it("deletes a payee", async () => {
		await request(app.getHttpServer()).delete(`/payees/${payeeId}`).expect(204);

		await request(app.getHttpServer()).get(`/payees/${payeeId}`).expect(404);
	});
});
