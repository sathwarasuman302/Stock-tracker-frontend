import type { Candle, Timeframe } from "../utils/candleAggregation";

export type TrendDirection = "Bullish" | "Bearish" | "Sideways" | "Insufficient Data";
export type EntrySetup = "LONG WATCH" | "SHORT WATCH" | "WAIT";

export interface TechnicalMarketAnalysis {
	trend: {
		direction: TrendDirection;
		reasons: string[];
		momentum: string;
		ema20: number | null;
		ema50: number | null;
		rsi14: number | null;
		support: number | null;
		resistance: number | null;
	};
	entry: {
		setup: EntrySetup;
		zone: { low: number; high: number } | null;
		confirmation: string;
	};
	levels: {
		target: number | null;
		stopLoss: number | null;
		invalidation: number | null;
		riskReward: number | null;
		explanation: string;
	};
	risk: {
		quality: "Good" | "Fair" | "Weak" | "Insufficient Data";
		mainRisk: string;
		invalidation: string;
		keyRisks: string[];
	};
	data: {
		currentPrice: number | null;
		timeframe: Timeframe;
		source: string;
		timestamp: number | null;
		candleCount: number;
		stale: boolean;
		volumeAvailable: boolean;
		volumeConfirmed: boolean | null;
	};
}

const roundPrice = (value: number) => Number(value.toFixed(2));

const calculateEma = (values: number[], period: number): number | null => {
	if (values.length < period) return null;
	const multiplier = 2 / (period + 1);
	let ema = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
	for (const value of values.slice(period)) {
		ema = (value - ema) * multiplier + ema;
	}
	return ema;
};

const calculateRsi = (closes: number[], period = 14): number | null => {
	if (closes.length < period + 1) return null;
	let gains = 0;
	let losses = 0;
	for (let index = 1; index <= period; index += 1) {
		const difference = closes[index] - closes[index - 1];
		gains += Math.max(difference, 0);
		losses += Math.max(-difference, 0);
	}
	let averageGain = gains / period;
	let averageLoss = losses / period;
	for (let index = period + 1; index < closes.length; index += 1) {
		const difference = closes[index] - closes[index - 1];
		averageGain = (averageGain * (period - 1) + Math.max(difference, 0)) / period;
		averageLoss = (averageLoss * (period - 1) + Math.max(-difference, 0)) / period;
	}
	if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
	return 100 - 100 / (1 + averageGain / averageLoss);
};

const staleAfterMs: Record<Timeframe, number> = {
	"1m": 3 * 60_000,
	"5m": 15 * 60_000,
	"15m": 45 * 60_000,
	"30m": 90 * 60_000,
	"1H": 3 * 60 * 60_000,
	"4H": 12 * 60 * 60_000,
	"1D": 4 * 24 * 60 * 60_000,
	"1W": 14 * 24 * 60 * 60_000,
	"1M": 45 * 24 * 60 * 60_000,
};

const insufficientAnalysis = (
	timeframe: Timeframe,
	source: string,
	timestamp: number | null,
	candleCount: number,
	currentPrice: number | null,
	stale: boolean,
	volumeAvailable: boolean
): TechnicalMarketAnalysis => ({
	trend: {
		direction: "Insufficient Data",
		reasons: [
			stale ? "Latest candle is stale for this timeframe." : `At least 50 valid candles are required; received ${candleCount}.`,
		],
		momentum: "Insufficient data",
		ema20: null,
		ema50: null,
		rsi14: null,
		support: null,
		resistance: null,
	},
	entry: {
		setup: "WAIT",
		zone: null,
		confirmation: "Wait for fresh, sufficient candle history before considering a setup.",
	},
	levels: {
		target: null,
		stopLoss: null,
		invalidation: null,
		riskReward: null,
		explanation: "Insufficient data to calculate levels.",
	},
	risk: {
		quality: "Insufficient Data",
		mainRisk: stale ? "The latest market data is stale." : "There is not enough valid history to assess the setup.",
		invalidation: "No trade setup is available.",
		keyRisks: [
			...(stale ? ["Stale market data"] : []),
			...(!volumeAvailable ? ["Volume data unavailable"] : []),
		],
	},
	data: {
		currentPrice,
		timeframe,
		source,
		timestamp,
		candleCount,
		stale,
		volumeAvailable,
		volumeConfirmed: null,
	},
});

export const analyzeMarketCandles = (
	candles: Candle[],
	timeframe: Timeframe,
	source: string,
	now = Date.now()
): TechnicalMarketAnalysis => {
	const validCandles = candles
		.filter((candle) =>
			Number.isFinite(candle.time) &&
			Number.isFinite(candle.open) &&
			Number.isFinite(candle.high) &&
			Number.isFinite(candle.low) &&
			Number.isFinite(candle.close) &&
			Number.isFinite(candle.volume) &&
			candle.open > 0 &&
			candle.low > 0 &&
			candle.high >= candle.low &&
			candle.high >= candle.open &&
			candle.high >= candle.close &&
			candle.low <= candle.open &&
			candle.low <= candle.close
		)
		.sort((first, second) => first.time - second.time);
	const lastCandle = validCandles.at(-1);
	const timestamp = lastCandle?.time ?? null;
	const currentPrice = lastCandle?.close ?? null;
	const stale = timestamp === null || now - timestamp > staleAfterMs[timeframe] || timestamp > now + 60_000;
	const volumeAvailable = validCandles.slice(-20).some((candle) => candle.volume > 0);

	if (validCandles.length < 50 || !lastCandle) {
		return insufficientAnalysis(
			timeframe,
			source,
			timestamp,
			validCandles.length,
			currentPrice,
			stale,
			volumeAvailable
		);
	}

	const closes = validCandles.map((candle) => candle.close);
	const ema20 = calculateEma(closes, 20);
	const ema50 = calculateEma(closes, 50);
	const rsi14 = calculateRsi(closes);
	if (ema20 === null || ema50 === null || rsi14 === null) {
		return insufficientAnalysis(
			timeframe,
			source,
			timestamp,
			validCandles.length,
			currentPrice,
			false,
			volumeAvailable
		);
	}
	const current = lastCandle.close;
	const structureCandles = validCandles.slice(-21, -1);
	const support = Math.min(...structureCandles.map((candle) => candle.low));
	const resistance = Math.max(...structureCandles.map((candle) => candle.high));
	const recentCandles = validCandles.slice(-20);
	const averageVolume = recentCandles.reduce((sum, candle) => sum + candle.volume, 0) / recentCandles.length;
	const volumeConfirmed = volumeAvailable && averageVolume > 0 && lastCandle.volume >= averageVolume * 1.2;
	const ranges = validCandles.slice(-14).map((candle) => candle.high - candle.low);
	const atr = ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
	const bullish = current > ema20 && ema20 > ema50;
	const bearish = current < ema20 && ema20 < ema50;
	const longMomentumAligned = rsi14 >= 50 && rsi14 < 70;
	const shortMomentumAligned = rsi14 > 30 && rsi14 <= 50;
	const direction: TrendDirection = bullish
		? "Bullish"
		: bearish
			? "Bearish"
			: "Sideways";
	const momentum = rsi14 >= 70
		? "Overbought"
		: rsi14 <= 30
			? "Oversold"
			: rsi14 >= 55
				? "Positive"
				: rsi14 <= 45
					? "Negative"
					: "Neutral";
	const reasons = [
		`Close ${current >= ema20 ? "above" : "below"} EMA 20 (${roundPrice(ema20)}).`,
		`EMA 20 ${ema20 >= ema50 ? "above" : "below"} EMA 50 (${roundPrice(ema50)}).`,
		`RSI 14 is ${roundPrice(rsi14)} (${momentum.toLowerCase()}); support ${roundPrice(support)}, resistance ${roundPrice(resistance)}.`,
	];

	let setup: EntrySetup = "WAIT";
	let zone: { low: number; high: number } | null = null;
	let confirmation = direction === "Bullish"
		? "Wait for bullish momentum and a confirmed close above recent resistance."
		: direction === "Bearish"
			? "Wait for bearish momentum and a confirmed close below recent support."
			: "Wait for price and momentum to align before considering a setup.";
	let target: number | null = null;
	let stopLoss: number | null = null;
	let riskReward: number | null = null;
	let levelExplanation = "Levels are not set because there is no confirmed entry setup.";
	let invalidation = "No trade setup is available.";

	if (!stale && bullish && longMomentumAligned && resistance > support && atr > 0) {
		setup = "LONG WATCH";
		const entryLow = resistance;
		const entryHigh = resistance + atr * 0.15;
		const stop = support - atr * 0.1;
		const riskPerShare = entryHigh - stop;
		const rewardToStructure = resistance > entryHigh ? resistance - entryHigh : 0;
		const projectedTarget = Math.max(rewardToStructure, riskPerShare * 2) + entryHigh;
		if (current < entryHigh && stop > 0 && projectedTarget > entryHigh) {
			zone = { low: roundPrice(entryLow), high: roundPrice(entryHigh) };
			stopLoss = roundPrice(stop);
			target = roundPrice(projectedTarget);
			riskReward = (target - entryHigh) / riskPerShare;
			confirmation = volumeAvailable
				? `Wait for a candle close above ${roundPrice(resistance)} with volume at least 1.2× the recent 20-candle average.`
				: `Wait for a candle close above ${roundPrice(resistance)}; volume confirmation is unavailable.`;
			invalidation = `A close below support at ${roundPrice(support)} invalidates the long setup.`;
			levelExplanation = "Target uses a minimum 2R projection from the structure-based stop; confirm against live resistance.";
		} else {
			confirmation = `Price has moved above the long watch zone (${roundPrice(entryLow)}–${roundPrice(entryHigh)}); avoid chasing and wait for a pullback or a fresh setup.`;
		}
	} else if (!stale && bearish && shortMomentumAligned && resistance > support && atr > 0) {
		const entryHigh = support;
		const entryLow = support - atr * 0.15;
		const stop = resistance + atr * 0.1;
		const riskPerShare = stop - entryLow;
		const projectedTarget = Math.max(entryLow - support, riskPerShare * 2);
		if (current >= entryLow && current <= entryHigh && entryLow > 0 && stop > entryHigh) {
			setup = "SHORT WATCH";
			zone = { low: roundPrice(entryLow), high: roundPrice(entryHigh) };
			stopLoss = roundPrice(stop);
			target = roundPrice(entryLow - projectedTarget);
			riskReward = (entryLow - target) / riskPerShare;
			confirmation = volumeAvailable
				? `Wait for a candle close below ${roundPrice(support)} with volume at least 1.2× the recent 20-candle average.`
				: `Wait for a candle close below ${roundPrice(support)}; volume confirmation is unavailable.`;
			invalidation = `A close above resistance at ${roundPrice(resistance)} invalidates the short setup.`;
			levelExplanation = "Target uses a minimum 2R projection from the structure-based stop; confirm against live support.";
		} else {
			confirmation = current < entryLow
				? `Price is already below the short watch zone (${roundPrice(entryLow)}–${roundPrice(entryHigh)}); avoid chasing and wait for a pullback or a fresh setup.`
				: `Wait for a confirmed close below support at ${roundPrice(support)} before considering a short setup.`;
		}
	}

	const keyRisks = [
		...(stale ? ["Latest candle is stale; historical indicators are for context only."] : []),
		...(direction === "Sideways" ? ["Moving averages and momentum do not align for a directional setup."] : []),
		...(setup === "WAIT" ? [confirmation] : []),
		...(volumeAvailable
			? volumeConfirmed ? [] : ["Latest candle lacks 1.2× average-volume confirmation."]
			: ["Volume data unavailable; volume confirmation cannot be assessed."]),
		...(rsi14 > 65 || rsi14 < 35 ? ["Momentum is near an extreme and may reverse."] : []),
	];
	const quality = stale || setup === "WAIT"
		? "Weak"
		: riskReward !== null && riskReward >= 2 && volumeConfirmed
			? "Good"
			: riskReward !== null && riskReward >= 1.5 && (!volumeAvailable || volumeConfirmed)
				? "Fair"
				: "Weak";

	return {
		trend: {
			direction,
			reasons,
			momentum,
			ema20: roundPrice(ema20),
			ema50: roundPrice(ema50),
			rsi14: roundPrice(rsi14),
			support: roundPrice(support),
			resistance: roundPrice(resistance),
		},
		entry: {
			setup,
			zone,
			confirmation: stale
				? "Wait for fresh market data before considering a trade setup."
				: confirmation,
		},
		levels: {
			target,
			stopLoss,
			invalidation: stopLoss,
			riskReward: riskReward === null ? null : Number(riskReward.toFixed(2)),
			explanation: levelExplanation,
		},
		risk: {
			quality,
			mainRisk: keyRisks[0] ?? "Price may fail to confirm the trend.",
			invalidation,
			keyRisks,
		},
		data: {
			currentPrice,
			timeframe,
			source,
			timestamp,
			candleCount: validCandles.length,
			stale,
			volumeAvailable,
			volumeConfirmed,
		},
	};
};
