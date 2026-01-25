export const CurrencyConfig: Record<
	string,
	{ locale: string; currency: string; divisor: number }
> = {
	USD: { locale: "en-US", currency: "USD", divisor: 100 },
	CAD: { locale: "en-CA", currency: "CAD", divisor: 100 },
};
