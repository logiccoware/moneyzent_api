export interface SeedUser {
	email: string;
	password: string;
	displayName?: string;
}

export const SEED_USER: SeedUser = {
	email: "demo@monovra.com",
	password: "password123",
	displayName: "Demo User",
};
