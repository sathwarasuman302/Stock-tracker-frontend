/**
 * Live Price Simulator - Generates realistic real-time price movements
 */

export type PriceUpdate = {
	price: number;
	change: number;
	changePercent: number;
	timestamp: number;
};

/**
 * Simulate realistic stock price movement with volatility
 */
export const generateRealisticPriceUpdate = (
	previousPrice: number,
	basePrice: number,
	volatility: number = 0.005
): number => {
	const rangeLimit = Math.max(basePrice * 0.12, 1.5);
	const tick = Date.now() / 1000;
	const meanReversion = (basePrice - previousPrice) * 0.0008;
	const cycleBias = Math.sin(tick / 12 + previousPrice / 120) * volatility * 0.9;
	const trendBias = Math.cos(tick / 18 + basePrice / 400) * volatility * 0.5;
	const changePercent = meanReversion + cycleBias + trendBias;
	const boundedChange = Math.min(Math.max(changePercent, -0.0105), 0.0105);
	const nextPrice = previousPrice * (1 + boundedChange);
	const lowerBound = basePrice - rangeLimit;
	const upperBound = basePrice + rangeLimit;

	return Number(Math.min(Math.max(nextPrice, lowerBound), upperBound).toFixed(2));
};

/**
 * Update OHLC values for a live candle
 */
export const updateCandle = (
	candle: {
		open: number;
		high: number;
		low: number;
		close: number;
	},
	newPrice: number
) => {
	return {
		open: candle.open,
		high: Math.max(candle.high, newPrice),
		low: Math.min(candle.low, newPrice),
		close: newPrice,
	};
};

/**
 * Generate volume with realistic patterns
 */
export const generateRealisticVolume = (): number => {
	// More realistic volume distribution
	const baseVolume = 50000;
	const volatility = Math.random() * 400000;
	const spike = Math.random() > 0.95 ? 800000 : 0; // 5% chance of volume spike
	return Math.floor(baseVolume + volatility + spike);
};

/**
 * Create a price notification
 */
export const createPriceAlert = (
	symbol: string,
	action: "buy" | "sell",
	price: number,
	quantity: number = 1
) => {
	return {
		id: `${Date.now()}-${Math.random()}`,
		symbol,
		action,
		price,
		quantity,
		timestamp: Date.now(),
		message: `${action.toUpperCase()} - ${symbol} @ ₹${price.toFixed(2)} x ${quantity}`,
	};
};
