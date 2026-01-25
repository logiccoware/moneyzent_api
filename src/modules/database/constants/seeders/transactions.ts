export interface SeedTransaction {
	payeeName: string;
	type: "EXPENSE" | "INCOME";
	/**
	 * ISO string date (e.g. 2025-12-05T12:00:00Z) for deterministic seeds.
	 * Falls back to daysAgo when not provided.
	 */
	date?: string;
	daysAgo?: number;
	memo?: string;
	splits: {
		categoryFullName: string;
		amount: number;
		memo?: string;
	}[];
}

const DECEMBER_2025_DATES = Array.from({ length: 31 }, (_, index) => {
	const day = String(index + 1).padStart(2, "0");
	return `2025-12-${day}T12:00:00Z`;
});

interface TransactionTemplate {
	payeeName: string;
	categoryFullName: string;
	baseAmount: number;
	amountStep: number;
	memo?: string;
	splitMemo?: string;
	minAmount?: number;
}

const DAILY_EXPENSE_TEMPLATES: TransactionTemplate[] = [
	{
		payeeName: "Whole Foods Market",
		categoryFullName: "food:groceries",
		baseAmount: 8200,
		amountStep: 250,
		memo: "Groceries and produce",
	},
	{
		payeeName: "Morning Brew Cafe",
		categoryFullName: "food:coffee shops",
		baseAmount: 750,
		amountStep: 100,
		memo: "Morning coffee",
	},
	{
		payeeName: "Sushi Central",
		categoryFullName: "food:restaurants",
		baseAmount: 4600,
		amountStep: 300,
		memo: "Dining out",
	},
	{
		payeeName: "Shell Gas",
		categoryFullName: "transportation:gas",
		baseAmount: 5200,
		amountStep: 400,
		memo: "Fuel refill",
	},
	{
		payeeName: "Blue Line Metro",
		categoryFullName: "transportation:public transit",
		baseAmount: 320,
		amountStep: 40,
		memo: "Commute rides",
		minAmount: 220,
	},
	{
		payeeName: "SwiftRide",
		categoryFullName: "transportation:rideshare",
		baseAmount: 2800,
		amountStep: 250,
		memo: "City rides",
	},
	{
		payeeName: "Home Depot",
		categoryFullName: "home projects:hardware",
		baseAmount: 9800,
		amountStep: 500,
		memo: "Home project supplies",
	},
	{
		payeeName: "Best Buy",
		categoryFullName: "shopping:electronics",
		baseAmount: 8900,
		amountStep: 700,
		memo: "Device upgrades",
	},
	{
		payeeName: "Urban Outfitters",
		categoryFullName: "shopping:clothing",
		baseAmount: 6200,
		amountStep: 400,
		memo: "Wardrobe refresh",
	},
	{
		payeeName: "Pulse Fitness",
		categoryFullName: "health:gym",
		baseAmount: 5500,
		amountStep: 0,
		memo: "Gym membership",
	},
	{
		payeeName: "Netflix",
		categoryFullName: "entertainment:streaming",
		baseAmount: 1599,
		amountStep: 0,
		memo: "Streaming subscription",
	},
	{
		payeeName: "Dropbox Storage",
		categoryFullName: "subscriptions:storage",
		baseAmount: 1200,
		amountStep: 0,
		memo: "Cloud storage",
	},
];

const MONTHLY_BILLS: SeedTransaction[] = [
	{
		payeeName: "City Rentals",
		type: "EXPENSE",
		date: "2025-12-01T12:00:00Z",
		memo: "Monthly rent",
		splits: [{ categoryFullName: "housing:rent", amount: 180000 }],
	},
	{
		payeeName: "Comcast Internet",
		type: "EXPENSE",
		date: "2025-12-02T12:00:00Z",
		splits: [{ categoryFullName: "bills utilities:internet", amount: 8900 }],
	},
	{
		payeeName: "AT&T Wireless",
		type: "EXPENSE",
		date: "2025-12-03T12:00:00Z",
		splits: [{ categoryFullName: "bills utilities:phone", amount: 7200 }],
	},
	{
		payeeName: "City Electric",
		type: "EXPENSE",
		date: "2025-12-04T12:00:00Z",
		splits: [{ categoryFullName: "bills utilities:electric", amount: 12400 }],
	},
	{
		payeeName: "City Water",
		type: "EXPENSE",
		date: "2025-12-05T12:00:00Z",
		splits: [{ categoryFullName: "bills utilities:water", amount: 4100 }],
	},
	{
		payeeName: "Waste Management",
		type: "EXPENSE",
		date: "2025-12-06T12:00:00Z",
		splits: [{ categoryFullName: "bills utilities:trash", amount: 3000 }],
	},
	{
		payeeName: "Coursera",
		type: "EXPENSE",
		date: "2025-12-09T12:00:00Z",
		splits: [{ categoryFullName: "education:courses", amount: 4200 }],
	},
	{
		payeeName: "Metropolitan Insurance",
		type: "EXPENSE",
		date: "2025-12-10T12:00:00Z",
		splits: [{ categoryFullName: "finance:insurance", amount: 8400 }],
	},
	{
		payeeName: "ByteCloud",
		type: "EXPENSE",
		date: "2025-12-11T12:00:00Z",
		splits: [{ categoryFullName: "business:saas", amount: 2300 }],
	},
	{
		payeeName: "Google Workspace",
		type: "EXPENSE",
		date: "2025-12-11T12:00:00Z",
		splits: [{ categoryFullName: "business:saas", amount: 1200 }],
	},
	{
		payeeName: "Red Cross Donation",
		type: "EXPENSE",
		date: "2025-12-12T12:00:00Z",
		splits: [{ categoryFullName: "gifts donations:charity", amount: 3000 }],
	},
	{
		payeeName: "PetSmart",
		type: "EXPENSE",
		date: "2025-12-13T12:00:00Z",
		splits: [{ categoryFullName: "pets:food", amount: 2600 }],
	},
	{
		payeeName: "Chase Bank Fees",
		type: "EXPENSE",
		date: "2025-12-14T12:00:00Z",
		splits: [{ categoryFullName: "finance:bank fees", amount: 350 }],
	},
	{
		payeeName: "Workshop Hub",
		type: "EXPENSE",
		date: "2025-12-16T12:00:00Z",
		splits: [{ categoryFullName: "education:workshops", amount: 5200 }],
	},
	{
		payeeName: "Petco",
		type: "EXPENSE",
		date: "2025-12-18T12:00:00Z",
		splits: [{ categoryFullName: "pets:grooming", amount: 4600 }],
	},
	{
		payeeName: "Staples Office Supplies",
		type: "EXPENSE",
		date: "2025-12-19T12:00:00Z",
		splits: [{ categoryFullName: "business:office supplies", amount: 4800 }],
	},
	{
		payeeName: "Vanguard Investments",
		type: "EXPENSE",
		date: "2025-12-20T12:00:00Z",
		splits: [{ categoryFullName: "finance:investing", amount: 12500 }],
	},
	{
		payeeName: "Delta Airlines",
		type: "EXPENSE",
		date: "2025-12-22T12:00:00Z",
		memo: "Holiday travel",
		splits: [{ categoryFullName: "travel:flights", amount: 52000 }],
	},
	{
		payeeName: "Marriott Hotels",
		type: "EXPENSE",
		date: "2025-12-23T12:00:00Z",
		splits: [{ categoryFullName: "travel:hotels", amount: 28000 }],
	},
	{
		payeeName: "Metropolitan Insurance",
		type: "EXPENSE",
		date: "2025-12-27T12:00:00Z",
		memo: "Auto coverage",
		splits: [{ categoryFullName: "finance:insurance", amount: 7600 }],
	},
];

const INCOME_ENTRIES: SeedTransaction[] = [
	{
		payeeName: "Acme Corp Payroll",
		type: "INCOME",
		date: "2025-12-15T12:00:00Z",
		memo: "Monthly salary",
		splits: [{ categoryFullName: "income:salary", amount: 450000 }],
	},
	{
		payeeName: "Acme Corp Payroll",
		type: "INCOME",
		date: "2025-12-29T12:00:00Z",
		memo: "Year-end bonus",
		splits: [{ categoryFullName: "income:bonus", amount: 250000 }],
	},
	{
		payeeName: "Side Hustle Platform",
		type: "INCOME",
		date: "2025-12-08T12:00:00Z",
		memo: "Side project payout",
		splits: [{ categoryFullName: "income:salary", amount: 68000 }],
	},
	{
		payeeName: "Freelance Client A",
		type: "INCOME",
		date: "2025-12-05T12:00:00Z",
		memo: "Design sprint delivery",
		splits: [{ categoryFullName: "income:bonus", amount: 92000 }],
	},
	{
		payeeName: "Vanguard Investments",
		type: "INCOME",
		date: "2025-12-20T12:00:00Z",
		memo: "Quarterly dividends",
		splits: [{ categoryFullName: "income:dividends", amount: 15500 }],
	},
];

export const SEED_TRANSACTIONS: SeedTransaction[] = [
	...INCOME_ENTRIES,
	...MONTHLY_BILLS,
	...DECEMBER_2025_DATES.flatMap((date, dayIndex) => {
		const templates = [
			DAILY_EXPENSE_TEMPLATES[dayIndex % DAILY_EXPENSE_TEMPLATES.length],
			DAILY_EXPENSE_TEMPLATES[(dayIndex + 3) % DAILY_EXPENSE_TEMPLATES.length],
			DAILY_EXPENSE_TEMPLATES[(dayIndex + 6) % DAILY_EXPENSE_TEMPLATES.length],
			DAILY_EXPENSE_TEMPLATES[(dayIndex + 9) % DAILY_EXPENSE_TEMPLATES.length],
		];

		return templates.map((template, entryIndex) => {
			const adjustment = ((dayIndex + entryIndex) % 3) - 1; // -1, 0, 1
			const baseAmount = template.baseAmount + adjustment * template.amountStep;
			const amount = Math.max(template.minAmount ?? 500, baseAmount);

			return {
				payeeName: template.payeeName,
				type: "EXPENSE" as const,
				date,
				memo: template.memo,
				splits: [
					{
						categoryFullName: template.categoryFullName,
						amount,
						memo: template.splitMemo,
					},
				],
			};
		});
	}),
];
