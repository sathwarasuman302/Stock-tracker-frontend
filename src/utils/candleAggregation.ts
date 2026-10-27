export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1H" | "4H" | "1D" | "1W" | "1M";

export const CHART_TIMEFRAMES: Timeframe[] = [
	"1m",
	"5m",
	"15m",
	"30m",
	"1H",
	"4H",
	"1D",
	"1W",
	"1M",
];

export type Candle = {
	time: number; // timestamp
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
};

export type VolumeCandle = {
	time: number;
	volume: number;
	isUp: boolean;
	isDown: boolean;
};

export const TIMEFRAME_MS: Record<Timeframe, number> = {
	"1m": 60 * 1000,
	"5m": 5 * 60 * 1000,
	"15m": 15 * 60 * 1000,
	"30m": 30 * 60 * 1000,
	"1H": 60 * 60 * 1000,
	"4H": 4 * 60 * 60 * 1000,
	"1D": 24 * 60 * 60 * 1000,
	"1W": 7 * 24 * 60 * 60 * 1000,
	"1M": 30 * 24 * 60 * 60 * 1000,
};

/**
 * Generate base minute-level candles for a stock
 * (These will be aggregated into larger timeframes)
 */
export const generateBaseCandles = (
	basePrice: number,
	minutesBack: number = 1440 // 1 day = 1440 minutes
): Candle[] => {
	const now = Date.now();
	const candles: Candle[] = [];

	let previous = basePrice * 0.97;

	for (let i = minutesBack; i >= 0; i--) {
		const time = now - i * 60 * 1000;
		const open = Number(
			(previous + (Math.random() - 0.5) * 32).toFixed(2)
		);
		const close = Number(
			(
				open +
				(Math.random() - 0.4) * 54 +
				(minutesBack - i) * 0.08
			).toFixed(2)
		);
		const high = Number((Math.max(open, close) + Math.random() * 16).toFixed(2));
		const low = Number((Math.min(open, close) - Math.random() * 16).toFixed(2));
		const volume = Math.floor(50000 + Math.random() * 500000);

		candles.push({
			time,
			open,
			high,
			low,
			close,
			volume,
		});

		previous = close;
	}

	return candles;
};

/**
 * Generate historical candles at a specific timeframe for chart display
 */
export const generateHistoricalCandles = (
	basePrice: number,
	timeframe: Timeframe,
	count: number = 120
): Candle[] => {
	const tfMs = TIMEFRAME_MS[timeframe];
	const now = Date.now();
	const alignedNow = Math.floor(now / tfMs) * tfMs;
	const candles: Candle[] = [];

	let previous = basePrice * 0.985;
	const phase = (basePrice % 97) / 97;

	for (let index = 0; index < count; index++) {
		const time = alignedNow - (count - index) * tfMs;
		const trend = basePrice * (0.985 + 0.015 * ((index + 1) / count));
		const cycle =
			Math.sin((index + 1) * 0.19 + phase) * basePrice * 0.006 +
			Math.cos((index + 1) * 0.41 + phase) * basePrice * 0.0025;
		const open = Number(previous.toFixed(2));
		const close = Number((trend + cycle).toFixed(2));
		const high = Number((Math.max(open, close) + basePrice * 0.0015).toFixed(2));
		const low = Number((Math.min(open, close) - basePrice * 0.0015).toFixed(2));
		const volume = Math.floor(
			25000 + (0.5 + Math.sin(index * 0.37 + phase) * 0.5) * 150000
		);

		candles.push({ time, open, high, low, close, volume });
		previous = close;
	}

	return candles;
};

/**
 * Aggregate minute candles into a larger timeframe
 */
export const aggregateCandles = (
	baseCandles: Candle[],
	fromTimeframe: Timeframe,
	toTimeframe: Timeframe
): Candle[] => {
	if (fromTimeframe === toTimeframe) {
		return baseCandles;
	}

	const toMs = TIMEFRAME_MS[toTimeframe];
	const aggregated: Candle[] = [];
	let currentGroup: Candle[] = [];

	for (const candle of baseCandles) {
		if (currentGroup.length === 0) {
			currentGroup.push(candle);
		} else {
			const groupStartTime = currentGroup[0].time;
			const candleTime = candle.time;

			// Check if this candle belongs to the current group
			const groupStartBucket = Math.floor(groupStartTime / toMs);
			const candleBucket = Math.floor(candleTime / toMs);

			if (groupStartBucket === candleBucket) {
				currentGroup.push(candle);
			} else {
				// Finalize the current group and start a new one
				if (currentGroup.length > 0) {
					aggregated.push(createAggregatedCandle(currentGroup));
				}
				currentGroup = [candle];
			}
		}
	}

	// Don't forget the last group
	if (currentGroup.length > 0) {
		aggregated.push(createAggregatedCandle(currentGroup));
	}

	return aggregated;
};

/**
 * Create a single aggregated candle from multiple base candles
 */
export const createAggregatedCandle = (candles: Candle[]): Candle => {
	if (candles.length === 0) {
		throw new Error("Cannot aggregate empty candle array");
	}

	const open = candles[0].open;
	const close = candles[candles.length - 1].close;
	const high = Math.max(...candles.map((c) => c.high));
	const low = Math.min(...candles.map((c) => c.low));
	const volume = candles.reduce((sum, c) => sum + c.volume, 0);
	const time = candles[0].time;

	return { time, open, high, low, close, volume };
};

/**
 * Get displayed candles for a specific timeframe
 * Automatically aggregates from base 1-minute candles
 */
export const getCandlesForTimeframe = (
	baseCandles: Candle[],
	timeframe: Timeframe
): Candle[] => {
	// All base candles are 1-minute
	if (timeframe === "1m") {
		return baseCandles;
	}

	// For other timeframes, we aggregate from 1m
	return aggregateCandles(baseCandles, "1m", timeframe);
};

/**
 * Convert candles to volume candles for rendering
 */
export const getVolumeCandles = (candles: Candle[]): VolumeCandle[] => {
	return candles.map((candle) => ({
		time: candle.time,
		volume: candle.volume,
		isUp: candle.close > candle.open,
		isDown: candle.close < candle.open,
	}));
};

/**
 * Get OHLC data for a specific candle index
 */
export const getOHLC = (
	candles: Candle[],
	index: number
): Candle | null => {
	if (index < 0 || index >= candles.length) {
		return null;
	}
	return candles[index];
};

/**
 * Calculate price range for chart scaling
 */
export const getPriceRange = (
	candles: Candle[]
): { min: number; max: number; mid: number } => {
	if (candles.length === 0) {
		return { min: 0, max: 100, mid: 50 };
	}

	const prices = candles.flatMap((c) => [c.high, c.low, c.open, c.close]);
	const min = Math.min(...prices);
	const max = Math.max(...prices);
	const range = max - min;
	const padding = Math.max(range * 0.1, Math.abs(max) * 0.005, 1);

	return {
		min: min - padding,
		max: max + padding,
		mid: (min + max) / 2,
	};
};
