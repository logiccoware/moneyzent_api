export interface SeedCategory {
	name: string;
	subcategories?: string[];
}

export const SEED_CATEGORIES: SeedCategory[] = [
	{
		name: "Food",
		subcategories: [
			"Groceries",
			"Restaurants",
			"Coffee Shops",
			"Meal Prep",
			"Snacks",
		],
	},
	{
		name: "Transportation",
		subcategories: ["Gas", "Public Transit", "Rideshare", "Parking", "Bike"],
	},
	{
		name: "Housing",
		subcategories: [
			"Rent",
			"Maintenance",
			"Supplies",
			"Furniture",
			"Insurance",
		],
	},
	{
		name: "Health",
		subcategories: ["Pharmacy", "Doctor", "Dentist", "Gym", "Therapy"],
	},
	{
		name: "Entertainment",
		subcategories: ["Streaming", "Movies", "Games", "Concerts", "Books"],
	},
	{
		name: "Shopping",
		subcategories: ["Clothing", "Electronics", "Home", "Gifts", "Beauty"],
	},
	{
		name: "Bills Utilities",
		subcategories: ["Electric", "Internet", "Phone", "Water", "Trash"],
	},
	{
		name: "Education",
		subcategories: ["Tuition", "Books", "Courses", "Software", "Workshops"],
	},
	{
		name: "Finance",
		subcategories: ["Bank Fees", "Investing", "Insurance", "Taxes", "Advisory"],
	},
	{
		name: "Travel",
		subcategories: ["Flights", "Hotels", "Car Rental", "Tours", "Baggage"],
	},
	{
		name: "Business",
		subcategories: [
			"SaaS",
			"Advertising",
			"Office Supplies",
			"Contractors",
			"Events",
		],
	},
	{
		name: "Gifts Donations",
		subcategories: [
			"Charity",
			"Family Gifts",
			"Friend Gifts",
			"Crowdfunding",
			"Fundraisers",
		],
	},
	{
		name: "Home Projects",
		subcategories: ["Hardware", "Lawn", "Cleaning", "Repairs", "Decor"],
	},
	{
		name: "Pets",
		subcategories: ["Food", "Vet", "Grooming", "Toys", "Boarding"],
	},
	{
		name: "Income",
		subcategories: ["Salary", "Bonus", "Dividends", "Refunds", "Interest"],
	},
	{
		name: "Savings",
		subcategories: [
			"Emergency Fund",
			"Retirement",
			"College Fund",
			"House Down",
			"Vacation",
		],
	},
	{
		name: "Subscriptions",
		subcategories: ["Productivity", "Music", "News", "Storage", "Design"],
	},
	{
		name: "Personal Care",
		subcategories: ["Hair", "Spa", "Skincare", "Nails", "Barber"],
	},
];
