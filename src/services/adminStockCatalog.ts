import { featuredStocks, type StockItem } from "../data/stocks";

export type AdminCatalogStock = {
	id: string;
	symbol: string;
	exchange: string;
	sector: string;
	price: number;
	changePercent: number;
};

const CATALOG_KEY = "stock-tracker-admin-stocks";
const CORE_OVERRIDES_KEY = "stock-tracker-admin-core-overrides";
const DELETED_CORE_STOCKS_KEY = "stock-tracker-admin-deleted-core-stocks";

const readCatalog = (): AdminCatalogStock[] => {
	try {
		const raw = localStorage.getItem(CATALOG_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as AdminCatalogStock[];
		if (!Array.isArray(parsed)) return [];
		return parsed;
	} catch {
		return [];
	}
};

const writeCatalog = (stocks: AdminCatalogStock[]) => {
	localStorage.setItem(CATALOG_KEY, JSON.stringify(stocks));
};

const readCoreOverrides = (): AdminCatalogStock[] => {
	try {
		const parsed = JSON.parse(localStorage.getItem(CORE_OVERRIDES_KEY) ?? "[]") as AdminCatalogStock[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const readDeletedCoreStockIds = (): string[] => {
	try {
		const parsed = JSON.parse(localStorage.getItem(DELETED_CORE_STOCKS_KEY) ?? "[]") as string[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

export const isAdminStockDeleted = (id: string): boolean =>
	readDeletedCoreStockIds().includes(id);

const writeCoreOverrides = (stocks: AdminCatalogStock[]) => {
	localStorage.setItem(CORE_OVERRIDES_KEY, JSON.stringify(stocks));
};

export const getAdminCoreStocks = (): StockItem[] => {
	const overrides = readCoreOverrides();
	const deletedIds = new Set(readDeletedCoreStockIds());
	return featuredStocks
		.filter((stock) => !deletedIds.has(stock.id))
		.map((stock) => {
			const override = overrides.find((entry) => entry.id === stock.id);
			return override && stock.id !== "3"
				? {
						...stock,
						symbolKey: override.symbol,
						exchangeKey: override.exchange,
						sectorKey: override.sector,
						basePrice: override.price,
						price: override.price,
						changePercent: override.changePercent,
					}
				: stock;
		});
};

export const saveAdminCoreStock = (stock: AdminCatalogStock): void => {
	const overrides = readCoreOverrides();
	const next: AdminCatalogStock = {
		...stock,
		symbol: stock.symbol.trim().toUpperCase(),
		exchange: stock.exchange.trim().toUpperCase() || "NSE",
		sector: stock.sector.trim() || "General",
		price: Number(stock.price),
		changePercent: Number(stock.changePercent) || 0,
	};
	writeCoreOverrides([...overrides.filter((entry) => entry.id !== stock.id), next]);
	localStorage.setItem(
		DELETED_CORE_STOCKS_KEY,
		JSON.stringify(readDeletedCoreStockIds().filter((id) => id !== stock.id))
	);
};

export const deleteAdminCoreStock = (id: string): void => {
	const deletedIds = new Set(readDeletedCoreStockIds());
	deletedIds.add(id);
	localStorage.setItem(DELETED_CORE_STOCKS_KEY, JSON.stringify([...deletedIds]));
	writeCoreOverrides(readCoreOverrides().filter((stock) => stock.id !== id));
};

export const applyAdminCoreStockSettings = (stocks: StockItem[]): StockItem[] => {
	const overrides = readCoreOverrides();
	const deletedIds = new Set(readDeletedCoreStockIds());
	return stocks
		.filter((stock) => !deletedIds.has(stock.id))
		.map((stock) => {
			const override = overrides.find((entry) => entry.id === stock.id);
			return override && stock.id !== "3"
				? {
						...stock,
						symbolKey: override.symbol,
						exchangeKey: override.exchange,
						sectorKey: override.sector,
						basePrice: override.price,
						price: override.price,
						changePercent: override.changePercent,
					}
				: stock;
		});
};

export const catalogToStockItem = (stock: AdminCatalogStock): StockItem => ({
	id: stock.id,
	symbolKey: stock.symbol,
	exchangeKey: stock.exchange,
	sectorKey: stock.sector,
	priceKey: stock.symbol,
	changeKey: stock.symbol,
	basePrice: stock.price,
	price: stock.price,
	changePercent: stock.changePercent,
});

export const getAdminCatalogStocks = (): AdminCatalogStock[] => readCatalog();

export const getAdminCatalogAsStockItems = (): StockItem[] =>
	readCatalog().map(catalogToStockItem);

export const getMergedStocks = (): StockItem[] => [
	...getAdminCoreStocks(),
	...getAdminCatalogAsStockItems(),
];

export const saveAdminCatalogStock = (
	stock: Omit<AdminCatalogStock, "id"> & { id?: string }
): AdminCatalogStock => {
	const catalog = readCatalog();
	const id = stock.id ?? `admin-${Date.now()}`;
	const next: AdminCatalogStock = {
		id,
		symbol: stock.symbol.trim().toUpperCase(),
		exchange: stock.exchange.trim().toUpperCase() || "NSE",
		sector: stock.sector.trim() || "General",
		price: Number(stock.price) || 0,
		changePercent: Number(stock.changePercent) || 0,
	};
	writeCatalog([...catalog.filter((entry) => entry.id !== id), next]);
	return next;
};

export const deleteAdminCatalogStock = (id: string): void => {
	writeCatalog(readCatalog().filter((entry) => entry.id !== id));
};
