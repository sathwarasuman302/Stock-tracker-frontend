import { useEffect, useMemo, useState } from "react";
import ProfessionalCandlestickChart from "./ProfessionalCandlestickChart";
import { fetchMarketCandles, type MarketCandleResponse } from "../services/marketApi";
import { TIMEFRAME_MS, type Candle, type Timeframe } from "../utils/candleAggregation";
import type { LiveMarketConnectionStatus } from "../hooks/useMarketData";

const getExchangeDateKey = (timestamp: number, timeframe: "1D" | "1W" | "1M") => {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: "Asia/Kolkata",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(timestamp);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((item) => item.type === type)?.value ?? "";
	const year = Number(part("year"));
	const month = Number(part("month"));
	const day = Number(part("day"));

	if (timeframe === "1D") return `${year}-${month}-${day}`;
	if (timeframe === "1M") return `${year}-${month}`;

	const monday = new Date(Date.UTC(year, month - 1, day));
	monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
	return monday.toISOString().slice(0, 10);
};

const isSameHistoricalInterval = (
	candleTime: number,
	quoteTime: number,
	timeframe: Timeframe
) => {
	if (timeframe === "1D" || timeframe === "1W" || timeframe === "1M") {
		return getExchangeDateKey(candleTime, timeframe) === getExchangeDateKey(quoteTime, timeframe);
	}
	return candleTime <= quoteTime && quoteTime - candleTime < TIMEFRAME_MS[timeframe];
};

const volumeFormatter = new Intl.NumberFormat("en-IN");

interface YahooFinanceCandlestickChartProps {
	stockId: string;
	stockName: string;
	yahooSymbol: string;
	marketSymbol?: string;
	exchange: string;
	timeframe: Timeframe;
	onTimeframeChange: (timeframe: Timeframe) => void;
	currentPrice: number | null;
	quoteCandles: Candle[];
	quoteTimestamp: number | null;
	connectionStatus: LiveMarketConnectionStatus;
	crypto24hVolume: number | null;
}

function YahooFinanceCandlestickChart({
	stockId,
	stockName,
	yahooSymbol,
	marketSymbol = yahooSymbol,
	exchange,
	timeframe,
	onTimeframeChange,
	currentPrice,
	quoteCandles,
	quoteTimestamp,
	connectionStatus,
	crypto24hVolume,
}: YahooFinanceCandlestickChartProps) {
	const isCrypto = exchange.toUpperCase() === "CRYPTO";
	const [marketData, setMarketData] = useState<MarketCandleResponse | null>(null);
	const [dailyMarketData, setDailyMarketData] = useState<MarketCandleResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [dailyVolumeError, setDailyVolumeError] = useState("");
	const latestReportedVolume = useMemo(
		() => (marketData?.candles ?? [])
			.filter((candle) => Number.isFinite(candle.volume) && candle.volume > 0)
			.at(-1) ?? null,
		[marketData]
	);
	const latestDailyVolume = useMemo(
		() => (timeframe === "1D" ? marketData?.candles : dailyMarketData?.candles)
			?.filter((candle) => Number.isFinite(candle.volume) && candle.volume > 0)
			.at(-1) ?? null,
		[dailyMarketData, marketData, timeframe]
	);
	const displayedCandles = useMemo(() => {
		const byTime = new Map((marketData?.candles ?? []).map((candle) => [candle.time, candle]));
		for (const [index, update] of quoteCandles.entries()) {
			const updateTime = index === quoteCandles.length - 1 && quoteTimestamp !== null
				? quoteTimestamp
				: update.time;
			const exactCandle = byTime.get(update.time);
			const containingCandle = exactCandle ? undefined : [...byTime.values()]
				.filter((candle) => isSameHistoricalInterval(candle.time, updateTime, timeframe))
				.sort((first, second) => second.time - first.time)[0];
			const matchedCandle = exactCandle ?? containingCandle;
			const candleTime = matchedCandle?.time ?? update.time;
			byTime.set(candleTime, matchedCandle
				? {
					...matchedCandle,
					high: Math.max(matchedCandle.high, update.high),
					low: Math.min(matchedCandle.low, update.low),
					close: update.close,
					volume: matchedCandle.volume + update.volume,
				}
				: update);
		}
		return [...byTime.values()].sort((first, second) => first.time - second.time);
	}, [marketData, quoteCandles, quoteTimestamp, timeframe]);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError("");
		setMarketData(null);

		void fetchMarketCandles(stockId, timeframe, controller.signal)
			.then((payload) => {
				const matchesExpectedSymbol =
					payload.symbol.toUpperCase() === marketSymbol.toUpperCase() ||
					payload.symbol.toUpperCase() === yahooSymbol.toUpperCase();
				if (!matchesExpectedSymbol || payload.exchange !== exchange ||
					payload.provider !== "Yahoo Finance") {
					throw new Error(`Candle feed did not match ${marketSymbol} on ${exchange}.`);
				}
				setMarketData(payload);
			})
			.catch((fetchError: unknown) => {
				if (controller.signal.aborted) return;
				setError(fetchError instanceof Error ? fetchError.message : "Unknown chart-data error.");
				setMarketData(null);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});

		return () => controller.abort();
	}, [exchange, stockId, timeframe, yahooSymbol]);

	useEffect(() => {
		if (marketSymbol.toUpperCase() !== "NIFTY" || timeframe === "1D") {
			setDailyMarketData(null);
			setDailyVolumeError("");
			return;
		}

		const controller = new AbortController();
		setDailyVolumeError("");
		void fetchMarketCandles(stockId, "1D", controller.signal)
			.then((payload) => {
				if (
					(payload.symbol.toUpperCase() !== "NIFTY" &&
						payload.symbol.toUpperCase() !== yahooSymbol.toUpperCase()) ||
					payload.exchange !== exchange ||
					payload.provider !== "Yahoo Finance"
				) {
					throw new Error(`Daily volume feed did not match ${marketSymbol} on ${exchange}.`);
				}
				setDailyMarketData(payload);
			})
			.catch((fetchError: unknown) => {
				if (controller.signal.aborted) return;
				setDailyMarketData(null);
				setDailyVolumeError(
					fetchError instanceof Error ? fetchError.message : "Unknown daily-volume error."
				);
			});

		return () => controller.abort();
	}, [exchange, marketSymbol, stockId, timeframe, yahooSymbol]);

	return (
		<section
			className={`live-candlestick-chart${isCrypto ? " live-candlestick-chart--crypto" : ""}`}
			aria-label={`${stockName} ${exchange} market chart`}
		>
			<header className="live-candlestick-chart__header">
				<strong>{stockName}</strong>
				<span>{timeframe} · {exchange}</span>
				{isCrypto
					? <span className={`crypto-feed-status crypto-feed-status--${connectionStatus}`}>
						{connectionStatus === "live"
							? "Coinbase · Live"
							: connectionStatus === "loading"
								? "Coinbase · Connecting"
								: "Coinbase · Reconnecting"}
					</span>
					: <span>Yahoo Finance · delayed</span>}
				{isCrypto ? (
					<span>
						24h volume: {crypto24hVolume === null
							? "Loading…"
							: `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(crypto24hVolume)} BTC`}
					</span>
				) : <span>
					{marketSymbol.toUpperCase() === "NIFTY" && timeframe !== "1D"
						? `Daily volume: ${latestDailyVolume
							? `${volumeFormatter.format(latestDailyVolume.volume)} · ${new Date(latestDailyVolume.time).toLocaleString("en-IN", {
								day: "numeric",
								month: "short",
								timeZone: "Asia/Kolkata",
							})} IST`
							: dailyVolumeError ? `Unavailable · ${dailyVolumeError}` : "Loading…"}`
						: `Volume (${timeframe}): ${latestReportedVolume
						? `${volumeFormatter.format(latestReportedVolume.volume)} · ${new Date(latestReportedVolume.time).toLocaleString("en-IN", {
							day: "numeric",
							month: "short",
							hour: "2-digit",
							minute: "2-digit",
							timeZone: "Asia/Kolkata",
						})} IST`
						: "Unavailable"}`}
				</span>}
				{quoteTimestamp !== null && (
					<time dateTime={new Date(quoteTimestamp).toISOString()}>
						Updated {new Date(quoteTimestamp).toLocaleString("en-IN", {
							dateStyle: "medium",
							timeStyle: "short",
							timeZone: "Asia/Kolkata",
						})}
					</time>
				)}
				<a
					className="live-candlestick-chart__external-link"
					href={`https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}/`}
					target="_blank"
					rel="noreferrer"
				>
					Open {stockName} on Yahoo Finance
				</a>
			</header>
			{(loading || error) && (
				<div className="chart-live-status" role={error ? "alert" : "status"}>
					{loading
						? `Loading ${stockName} historical candles…`
						: `Delayed ${stockName} candles are unavailable. ${error}`}
				</div>
			)}
			{isCrypto && connectionStatus === "error" && (
				<div className="chart-live-status" role="status">
					Coinbase live feed disconnected. Reconnecting automatically; the last price is retained.
				</div>
			)}
			<ProfessionalCandlestickChart
				candles={displayedCandles}
				currentPrice={currentPrice}
				stockSymbol={stockName}
				stockExchange={exchange}
				timeframe={timeframe}
				onTimeframeChange={onTimeframeChange}
				volumeAvailable={(marketData?.candles ?? []).some((candle) => candle.volume > 0)}
				volumeLabel="Volume · delayed"
				volumeUnavailableMessage={marketSymbol.toUpperCase() === "NIFTY" && timeframe !== "1D"
					? "Yahoo Finance does not provide NIFTY intraday volume; latest daily volume is shown above."
					: undefined}
			/>
		</section>
	);
}

export default YahooFinanceCandlestickChart;
