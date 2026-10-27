import { featuredStocks, type StockItem } from "../data/stocks";
import {
	applyAdminCoreStockSettings,
	getAdminCatalogAsStockItems,
	saveAdminCatalogStock,
} from "./adminStockCatalog";
import type { Candle, Timeframe } from "../utils/candleAggregation";

export type LiveMarketQuote = {
	id: string;
	symbol: string;
	name: string;
	exchange: string;
	sector?: string;
	basePrice: number;
	price: number;
	change: number;
	changePercent: number;
	lastUpdated: number;
	volume?: number;
	dataSource?: "simulated" | "provider" | "delayed";
};

export type MarketCandleResponse = {
	symbol: string;
	name: string;
	exchange: string;
	provider: string;
	dataSource: "delayed";
	timeframe: Timeframe;
	lastUpdated: number | null;
	candles: Candle[];
};

const FALLBACK_SYMBOLS = [
	"RELIANCE.NS",
	"TCS.BO",
	"NIFTY",
	"HDFCBANK.NS",
	"ICICIBANK.NS",
	"ITC.NS",
	"INFY.NS",
	"SBIN.NS",
	"BTC-USD",
] as const;

const buildLiveFallbackStocks = (): StockItem[] => {
	const now = Date.now();

	return applyAdminCoreStockSettings(featuredStocks.filter((stock) => stock.basePrice > 0).map((stock, index) => {
		const wave = Math.sin(now / 35000 + index) * 0.12;
		const nextChangePercent = Number((stock.changePercent + wave).toFixed(2));
		const nextPrice = Number((stock.basePrice * (1 + nextChangePercent / 100)).toFixed(2));

		return {
			...stock,
			price: nextPrice,
			changePercent: nextChangePercent,
			dataSource: "simulated",
			lastUpdated: now,
		};
	}));
};

const symbolMap: Record<string, { id: string; symbolKey: string; exchangeKey: string; sectorKey: string; priceKey: string; changeKey: string; basePrice: number }> = {
	"RELIANCE.NS": {
		id: "1",
		symbolKey: "stockReliance",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorEnergy",
		priceKey: "stockReliancePrice",
		changeKey: "stockRelianceChange",
		basePrice: 2485.3,
	},
	"TCS.BO": {
		id: "2",
		symbolKey: "stockTcs",
		exchangeKey: "exchangeBse",
		sectorKey: "sectorTech",
		priceKey: "stockTcsPrice",
		changeKey: "stockTcsChange",
		basePrice: 2280.0,
	},
	"NIFTY": {
		id: "3",
		symbolKey: "stockNifty",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorIndex",
		priceKey: "stockNiftyPrice",
		changeKey: "stockNiftyChange",
		basePrice: 25000,
	},
	"HDFCBANK.NS": {
		id: "4",
		symbolKey: "stockHdfcBank",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorBanking",
		priceKey: "stockHdfcBankPrice",
		changeKey: "stockHdfcBankChange",
		basePrice: 1725.4,
	},
	"ICICIBANK.NS": {
		id: "5",
		symbolKey: "stockIciciBank",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorBanking",
		priceKey: "stockIciciBankPrice",
		changeKey: "stockIciciBankChange",
		basePrice: 1248.75,
	},
	"ITC.NS": {
		id: "6",
		symbolKey: "stockItc",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorFmcg",
		priceKey: "stockItcPrice",
		changeKey: "stockItcChange",
		basePrice: 465.2,
	},
	"INFY.NS": {
		id: "7",
		symbolKey: "stockInfy",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorTech",
		priceKey: "stockInfyPrice",
		changeKey: "stockInfyChange",
		basePrice: 1500,
	},
	"SBIN.NS": {
		id: "8",
		symbolKey: "stockSbin",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorBanking",
		priceKey: "stockSbinPrice",
		changeKey: "stockSbinChange",
		basePrice: 0,
	},
	"BTC-USD": {
		id: "9",
		symbolKey: "stockBitcoin",
		exchangeKey: "exchangeCrypto",
		sectorKey: "sectorCrypto",
		priceKey: "stockBitcoinPrice",
		changeKey: "stockBitcoinChange",
		basePrice: 0,
	},
};

const readNumber = (value: unknown) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const stripSymbol = (value: unknown) => String(value ?? "").trim();

const normalizeMarketQuote = (item: Record<string, unknown>) => {
	const symbol =
		stripSymbol(item.symbol ?? item.ticker ?? item.symbolName ?? item.name ?? item.code)
		.toUpperCase();
	const config = symbolMap[symbol] ?? symbolMap[FALLBACK_SYMBOLS.find((entry) => entry === symbol) ?? ""];
	if (!config) return null;

	const price =
		readNumber(item.price ?? item.lastPrice ?? item.latestPrice ?? item.close ?? item.currentPrice ?? item.regularMarketPrice ?? item.value) ??
		config.basePrice;
	const changePercent =
		readNumber(
			item.changePercent ??
			item.percentChange ??
			item.pctChange ??
			item.dayChangePercent ??
			item.change
		) ?? 0;

	return {
		id: config.id,
		symbolKey: config.symbolKey,
		exchangeKey: config.exchangeKey,
		sectorKey: config.sectorKey,
		priceKey: config.priceKey,
		changeKey: config.changeKey,
		basePrice: config.basePrice,
		price,
		changePercent,
		dataSource: "provider",
		lastUpdated: Date.now(),
	} satisfies StockItem;
};

const resolveBackendUrl = () => {
	const configured = import.meta.env.VITE_MARKET_API_URL as string | undefined;
	return configured && configured.trim() ? configured : "/api";
};

export const fetchLatestStockQuote = async (stockId: string): Promise<LiveMarketQuote> => {
	const endpoint = stockId === "sensex"
		? "/market/index/quote"
		: stockId === "nifty" || stockId === "3"
			? "/market/nifty/quote"
			: "/market/quote";
	const response = await fetch(`${resolveBackendUrl()}${endpoint}?id=${encodeURIComponent(stockId)}`);
	if (!response.ok) {
		const payload = (await response.json()) as Record<string, unknown>;
		throw new Error(
			typeof payload.error === "string"
				? payload.error
				: `Market quote request failed with status ${response.status}.`
		);
	}
	const payload = (await response.json()) as Record<string, unknown>;
	return {
		...payload,
		lastUpdated: readNumber(payload.lastUpdated ?? payload.timestamp) ?? Date.now(),
		volume: readNumber(
			payload.cumulativeVolume ?? payload.regularMarketVolume ?? payload.volume
		) ?? undefined,
		dataSource: payload.dataSource === "provider"
			? "provider"
			: payload.dataSource === "delayed"
				? "delayed"
				: "simulated",
	} as LiveMarketQuote;
};

export const fetchMarketCandles = async (
	stockId: string,
	timeframe: Timeframe,
	signal?: AbortSignal
): Promise<MarketCandleResponse> => {
	const query = new URLSearchParams({ id: stockId, timeframe });
	const timeoutSignal = AbortSignal.timeout(15_000);
	const requestSignal = signal
		? AbortSignal.any([signal, timeoutSignal])
		: timeoutSignal;
	let response: Response;
	try {
		response = await fetch(`${resolveBackendUrl()}/market/candles?${query}`, {
			signal: requestSignal,
		});
	} catch (error) {
		if (timeoutSignal.aborted && !signal?.aborted) {
			throw new Error("Market candle request timed out. Please refresh the analysis.");
		}
		throw error;
	}
	const payload = (await response.json()) as Partial<MarketCandleResponse> & {
		error?: string;
	};
	if (!response.ok) {
		throw new Error(payload.error ?? `Market candle request failed with status ${response.status}.`);
	}
	if (
		typeof payload.symbol !== "string" ||
		typeof payload.name !== "string" ||
		typeof payload.exchange !== "string" ||
		typeof payload.provider !== "string" ||
		payload.dataSource !== "delayed" ||
		payload.timeframe !== timeframe ||
		!(payload.lastUpdated === null ||
			(typeof payload.lastUpdated === "number" && Number.isFinite(payload.lastUpdated))) ||
		!Array.isArray(payload.candles) ||
		!payload.candles.every((candle) =>
			candle !== null &&
			typeof candle === "object" &&
			Number.isFinite(candle.time) &&
			Number.isFinite(candle.open) &&
			Number.isFinite(candle.high) &&
			Number.isFinite(candle.low) &&
			Number.isFinite(candle.close) &&
			Number.isFinite(candle.volume) &&
			candle.high >= candle.low &&
			candle.high >= candle.open &&
			candle.high >= candle.close &&
			candle.low <= candle.open &&
			candle.low <= candle.close
		)
	) {
		throw new Error("Market data provider returned invalid candle data.");
	}
	return payload as MarketCandleResponse;
};

export const requestMarketAnalysisCommentary = async (
	stockId: string,
	timeframe: Timeframe,
	context: string,
	signal?: AbortSignal
): Promise<string> => {
	const timeoutSignal = AbortSignal.timeout(25_000);
	const requestSignal = signal
		? AbortSignal.any([signal, timeoutSignal])
		: timeoutSignal;
	const response = await fetch(`${resolveBackendUrl()}/market/analysis/commentary`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ stockId, timeframe, context }),
		signal: requestSignal,
	});
	const payload = await response.json() as { commentary?: unknown; error?: string };
	if (!response.ok) {
		throw new Error(payload.error ?? `AI analysis request failed with status ${response.status}.`);
	}
	if (typeof payload.commentary !== "string" || payload.commentary.trim().length === 0) {
		throw new Error("AI commentary service returned an invalid response.");
	}
	return payload.commentary;
};

export const fetchLiveStocks = async (): Promise<StockItem[]> => {
	let providerError: Error | null = null;
	try {
		const response = await fetch(`${resolveBackendUrl()}/market/quotes`);
		if (response.status === 502) {
			providerError = new Error("Market data is temporarily unavailable. Please try again shortly.");
		}
		if (response.ok) {
			const payload = (await response.json()) as LiveMarketQuote[];
			let catalogStocks = getAdminCatalogAsStockItems();
			let catalogById = new Map(catalogStocks.map((stock) => [stock.id, stock]));
			for (const quote of payload) {
				if (quote.id.startsWith("admin-") && !catalogById.has(quote.id)) {
					saveAdminCatalogStock({
						id: quote.id,
						symbol: quote.symbol,
						exchange: quote.exchange,
						sector: quote.sector ?? "General",
						price: quote.basePrice,
						changePercent: quote.changePercent,
					});
				}
			}
			catalogStocks = getAdminCatalogAsStockItems();
			catalogById = new Map(catalogStocks.map((stock) => [stock.id, stock]));
			const mappedStocks = payload
				.map((quote) => {
					const customStock = catalogById.get(quote.id);
					if (customStock) {
						return {
							...customStock,
							basePrice: quote.basePrice,
							price: quote.price,
							changePercent: quote.changePercent,
							dataSource: quote.dataSource ?? "provider",
							lastUpdated: quote.lastUpdated,
						};
					}
					const mapped = symbolMap[quote.symbol.toUpperCase()];
					if (!mapped) {
						return {
							id: quote.id,
							symbolKey: quote.name || quote.symbol,
							exchangeKey: quote.exchange,
							sectorKey: "General",
							priceKey: quote.name || quote.symbol,
							changeKey: quote.name || quote.symbol,
							basePrice: quote.basePrice,
							price: quote.price,
							changePercent: quote.changePercent,
							dataSource: quote.dataSource ?? "provider",
							lastUpdated: quote.lastUpdated,
						};
					}
					return {
						id: quote.id,
						symbolKey: mapped.symbolKey,
						exchangeKey: mapped.exchangeKey,
						sectorKey: mapped.sectorKey,
						priceKey: mapped.priceKey,
						changeKey: mapped.changeKey,
						basePrice: quote.basePrice,
						price: quote.price,
						changePercent: quote.changePercent,
						dataSource: quote.dataSource ?? "provider",
						lastUpdated: quote.lastUpdated,
					};
				});
			return applyAdminCoreStockSettings(mappedStocks);
		}
	} catch {
		// fallback below
	}

	if (providerError) throw providerError;

	const apiUrl = import.meta.env.VITE_MARKET_API_URL as string | undefined;
	if (!apiUrl) {
		return buildLiveFallbackStocks();
	}

	const apiKey = import.meta.env.VITE_MARKET_API_KEY as string | undefined;
	const symbols = (import.meta.env.VITE_MARKET_API_SYMBOLS as string | undefined) ?? FALLBACK_SYMBOLS.join(",");

	const query = new URLSearchParams();
	query.set("symbols", symbols);
	const requestUrl = `${apiUrl}${apiUrl.includes("?") ? "&" : "?"}${query.toString()}`;

	try {
		const response = await fetch(requestUrl, {
			headers: apiKey ? { "x-api-key": apiKey } : undefined,
		});

		if (!response.ok) {
			return buildLiveFallbackStocks();
		}

		const payload = await response.json();
		const rows = Array.isArray(payload)
			? payload
			: Array.isArray(payload.data)
				? payload.data
				: Array.isArray(payload.results)
					? payload.results
					: Array.isArray(payload.quoteResponse?.result)
						? payload.quoteResponse.result
						: Array.isArray(payload.values)
							? payload.values
							: [];

		const normalized = rows
			.map((row: unknown) => normalizeMarketQuote((row ?? {}) as Record<string, unknown>))
			.filter(Boolean) as StockItem[];

		if (normalized.length) {
			return applyAdminCoreStockSettings(normalized);
		}

		return buildLiveFallbackStocks();
	} catch {
		return buildLiveFallbackStocks();
	}
};
