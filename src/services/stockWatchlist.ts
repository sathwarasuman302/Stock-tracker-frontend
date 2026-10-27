const WATCHLIST_STORAGE_PREFIX = "stock-tracker-watchlist";

const getStorageKey = (email?: string) =>
	`${WATCHLIST_STORAGE_PREFIX}:${email?.trim().toLowerCase() || "guest"}`;

export const readStockWatchlist = (email?: string): string[] => {
	const raw = localStorage.getItem(getStorageKey(email));
	if (!raw) return [];

	const parsed: unknown = JSON.parse(raw);
	if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
		throw new Error("Saved watchlist data is invalid. Clear the saved watchlist and try again.");
	}
	return [...new Set(parsed)];
};

export const writeStockWatchlist = (email: string | undefined, stockIds: string[]) => {
	localStorage.setItem(getStorageKey(email), JSON.stringify([...new Set(stockIds)]));
};
