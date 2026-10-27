/** Aggregates backend quote ticks into timeframe-aligned candles. */

import {
	type Candle,
	type Timeframe,
	TIMEFRAME_MS,
} from "../utils/candleAggregation";

export type MarketDataSnapshot = {
	historicalCandles: Candle[];
	currentCandle: Candle | null;
	currentPrice: number;
	change: number;
	changePercent: number;
	timeframe: Timeframe;
	lastUpdated: number | null;
	volumeAvailable: boolean;
	volumeLabel: string;
};

export type MarketDataListener = (snapshot: MarketDataSnapshot) => void;

type PriceTick = {
	time: number;
	price: number;
	volumeDelta: number;
};

export class MarketDataService {
	private timeframe: Timeframe;
	private historicalCandles: Candle[] = [];
	private currentCandle: Candle | null = null;
	private currentPrice: number;
	private dayOpen: number;
	private change = 0;
	private changePercent = 0;
	private listeners = new Set<MarketDataListener>();
	private ticks: PriceTick[] = [];
	private lastTickTime = 0;
	private lastUpdated: number | null = null;
	private lastCumulativeVolume: number | null = null;
	private volumeAvailable = false;

	constructor(basePrice: number, timeframe: Timeframe = "5m") {
		this.timeframe = timeframe;
		this.currentPrice = basePrice;
		this.dayOpen = basePrice;
	}

	private getCurrentBucket(now: number): number {
		const tfMs = TIMEFRAME_MS[this.timeframe];
		return Math.floor(now / tfMs) * tfMs;
	}

	private rebuildCandlesForTimeframe(): void {
		const candlesByTime = new Map<number, Candle>();
		const tickBuckets = new Map<number, Candle>();
		for (const tick of this.ticks) {
			const bucket = this.getCurrentBucket(tick.time);
			const existing = tickBuckets.get(bucket);
			if (existing) {
				tickBuckets.set(bucket, {
					...existing,
					high: Math.max(existing.high, tick.price),
					low: Math.min(existing.low, tick.price),
					close: tick.price,
					volume: existing.volume + tick.volumeDelta,
				});
			} else {
				tickBuckets.set(bucket, {
					time: bucket,
					open: tick.price,
					high: tick.price,
					low: tick.price,
					close: tick.price,
					volume: tick.volumeDelta,
				});
			}
		}

		const timeframeMs = TIMEFRAME_MS[this.timeframe];
		for (const [time, candle] of [...tickBuckets.entries()].sort((a, b) => a[0] - b[0])) {
			const previous = candlesByTime.get(time - timeframeMs);
			const open = previous?.close ?? candle.open;
			candlesByTime.set(time, {
				...candle,
				open,
				high: Math.max(candle.high, open),
				low: Math.min(candle.low, open),
			});
		}

		const activeBucket = this.getCurrentBucket(Date.now());
		const candles = [...candlesByTime.values()].sort((a, b) => a.time - b.time);
		this.currentCandle = candlesByTime.get(activeBucket) ?? null;
		this.historicalCandles = candles
			.filter((candle) => candle.time < activeBucket)
			.slice(-500);
	}

	private getChange(): { change: number; changePercent: number } {
		return {
			change: this.change,
			changePercent: this.changePercent,
		};
	}

	getSnapshot(): MarketDataSnapshot {
		const { change, changePercent } = this.getChange();
		return {
			historicalCandles: this.historicalCandles,
			currentCandle: this.currentCandle,
			currentPrice: this.currentPrice,
			change,
			changePercent,
			timeframe: this.timeframe,
			lastUpdated: this.lastUpdated,
			volumeAvailable: this.volumeAvailable,
			volumeLabel: this.lastCumulativeVolume !== null
				? "Volume · estimated history"
				: this.ticks.length > 0
					? "Tick volume (estimated)"
					: "Volume unavailable",
		};
	}

	getDisplayCandles(): Candle[] {
		return [
			...this.historicalCandles,
			...(this.currentCandle ? [this.currentCandle] : []),
		];
	}

	subscribe(listener: MarketDataListener): () => void {
		this.listeners.add(listener);
		listener(this.getSnapshot());
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		const snapshot = this.getSnapshot();
		this.listeners.forEach((listener) => listener(snapshot));
	}

	updateQuote(
		nextPrice: number,
		nextChangePercent = 0,
		timestamp = Date.now(),
		cumulativeVolume?: number,
		nextChange?: number
	): void {
		if (!Number.isFinite(nextPrice) || nextPrice <= 0 || timestamp < this.lastTickTime) return;
		const bucket = this.getCurrentBucket(timestamp);
		if (this.currentCandle && bucket < this.currentCandle.time) return;
		const safePrice = Number(nextPrice.toFixed(2));
		let volumeDelta = 0;

		if (Number.isFinite(cumulativeVolume) && cumulativeVolume! >= 0) {
			const safeVolume = cumulativeVolume!;
			volumeDelta = this.lastCumulativeVolume === null
				? 0
				: safeVolume >= this.lastCumulativeVolume
					? safeVolume - this.lastCumulativeVolume
					: safeVolume;
			this.lastCumulativeVolume = safeVolume;
		} else {
			volumeDelta = 1;
		}

		this.currentPrice = safePrice;
		if (Number.isFinite(nextChangePercent) && 1 + nextChangePercent / 100 > 0) {
			this.dayOpen = safePrice / (1 + nextChangePercent / 100);
			this.changePercent = Number(nextChangePercent.toFixed(2));
		}
		this.change = typeof nextChange === "number" && Number.isFinite(nextChange)
			? Number(nextChange.toFixed(2))
			: Number((safePrice - this.dayOpen).toFixed(2));
		this.lastTickTime = timestamp;
		this.lastUpdated = timestamp;
		this.ticks.push({ time: timestamp, price: safePrice, volumeDelta });
		if (this.ticks.length > 25000) this.ticks = this.ticks.slice(-20000);
		this.volumeAvailable = true;

		if (!this.currentCandle || bucket > this.currentCandle.time) {
			if (this.currentCandle) {
				this.historicalCandles = [...this.historicalCandles, this.currentCandle].slice(-500);
			}
			const open = this.currentCandle?.close ??
				this.historicalCandles[this.historicalCandles.length - 1]?.close ?? safePrice;
			this.currentCandle = {
				time: bucket,
				open,
				high: Math.max(open, safePrice),
				low: Math.min(open, safePrice),
				close: safePrice,
				volume: volumeDelta,
			};
		} else {
			this.currentCandle = {
				...this.currentCandle,
				high: Math.max(this.currentCandle.high, safePrice),
				low: Math.min(this.currentCandle.low, safePrice),
				close: safePrice,
				volume: this.currentCandle.volume + volumeDelta,
			};
		}

		this.notify();
	}

	setTimeframe(timeframe: Timeframe): void {
		if (timeframe === this.timeframe) return;
		this.timeframe = timeframe;
		this.rebuildCandlesForTimeframe();
		this.notify();
	}

	setBasePrice(basePrice: number): void {
		this.currentPrice = basePrice;
		this.dayOpen = basePrice;
		this.change = 0;
		this.changePercent = 0;
		this.historicalCandles = [];
		this.currentCandle = null;
		this.ticks = [];
		this.lastTickTime = 0;
		this.lastUpdated = null;
		this.lastCumulativeVolume = null;
		this.volumeAvailable = false;
		this.notify();
	}

	destroy(): void {
		this.listeners.clear();
	}
}
