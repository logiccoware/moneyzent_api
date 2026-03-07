import * as request from "supertest";
import {
	createE2eContext,
	destroyE2eContext,
	type E2eContext,
} from "./utils/e2e";

describe("Account (e2e)", () => {
	let context: E2eContext;
	let app: E2eContext["app"];
	let accountId: string;

	beforeAll(async () => {
		context = await createE2eContext();
		app = context.app;
	});

	afterAll(async () => {
		await destroyE2eContext(context);
	});

	it("creates an account", async () => {
		const response = await request(app.getHttpServer())
			.post("/accounts")
			.send({ name: "Checking", currencyType: "USD" })
			.expect(201);

		expect(response.body).toEqual({
			id: expect.any(String),
			name: "Checking",
			currencyType: "USD",
		});
		accountId = response.body.id;
	});

	it("lists accounts for the user", async () => {
		const response = await request(app.getHttpServer())
			.get("/accounts")
			.expect(200);

		expect(response.body).toEqual(
			expect.arrayContaining([
				{ id: accountId, name: "Checking", currencyType: "USD" },
			]),
		);
	});

	it("fetches a single account", async () => {
		const response = await request(app.getHttpServer())
			.get(`/accounts/${accountId}`)
			.expect(200);

		expect(response.body).toEqual({
			id: accountId,
			name: "Checking",
			currencyType: "USD",
		});
	});

	it("updates an account", async () => {
		const response = await request(app.getHttpServer())
			.patch(`/accounts/${accountId}`)
			.send({ name: "Savings", currencyType: "CAD" })
			.expect(200);

		expect(response.body).toEqual({
			id: accountId,
			name: "Savings",
			currencyType: "CAD",
		});
	});

	it("returns 404 for a non-existent account", async () => {
		await request(app.getHttpServer())
			.get("/accounts/00000000-0000-0000-0000-000000000000")
			.expect(404);
	});

	it("returns 400 for invalid create payload", async () => {
		await request(app.getHttpServer())
			.post("/accounts")
			.send({ name: "", currencyType: "USD" })
			.expect(400);
	});

	it("deletes an account", async () => {
		await request(app.getHttpServer())
			.delete(`/accounts/${accountId}`)
			.expect(204);

		await request(app.getHttpServer())
			.get(`/accounts/${accountId}`)
			.expect(404);
	});
});
