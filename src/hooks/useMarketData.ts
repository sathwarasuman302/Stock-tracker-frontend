import { useCallback, useEffect, useRef, useState } from "react";
import {
	MarketDataService,
	type MarketDataSnapshot,
} from "../services/marketDataService";
import { fetchLatestStockQuote } from "../services/marketApi";
import type { Timeframe } from "../utils/candleAggregation";

export type LiveMarketConnectionStatus = "loading" | "live" | "delayed" | "simulated" | "error";

export function useMarketData(
	stockId: string,
	basePrice: number,
	initialTimeframe: Timeframe = "5m"
) {
	const serviceRef = useRef<MarketDataService | null>(null);
	const [snapshot, setSnapshot] = useState<MarketDataSnapshot>(() => {
		const service = new MarketDataService(basePrice, initialTimeframe);
		serviceRef.current = service;
		return service.getSnapshot();
	});
	const [connectionStatus, setConnectionStatus] = useState<LiveMarketConnectionStatus>("loading");
	const [connectionError, setConnectionError] = useState("");
	const [crypto24hVolume, setCrypto24hVolume] = useState<number | null>(null);

	useEffect(() => {
		const service = new MarketDataService(basePrice, initialTimeframe);
		serviceRef.current = service;
		setSnapshot(service.getSnapshot());
		setConnectionStatus("loading");

		const unsubscribe = service.subscribe(setSnapshot);

		let isMounted = true;
		if (stockId === "9") {
			let socket: WebSocket | null = null;
			let reconnectTimer: number | null = null;
			let reconnectAttempt = 0;

			const connect = () => {
				if (!isMounted) return;
				socket = new WebSocket("wss://ws-feed.exchange.coinbase.com");
				socket.onopen = () => {
					socket?.send(JSON.stringify({
						type: "subscribe",
						product_ids: ["BTC-USD"],
						channels: ["ticker"],
					}));
				};
				socket.onmessage = (event: MessageEvent<string>) => {
					try {
						const message: unknown = JSON.parse(event.data);
						if (message === null || typeof message !== "object") return;
						const ticker = message as Record<string, unknown>;
						if (ticker.type !== "ticker" || ticker.product_id !== "BTC-USD") return;

						const price = Number(ticker.price);
						const open24h = Number(ticker.open_24h);
						if (!Number.isFinite(price) || price <= 0 ||
							!Number.isFinite(open24h) || open24h <= 0) return;

						const change = price - open24h;
						const changePercent = (change / open24h) * 100;
						const timestamp = typeof ticker.time === "string"
							? Date.parse(ticker.time)
							: Date.now();
						service.updateQuote(
							price,
							changePercent,
							Number.isFinite(timestamp) ? timestamp : Date.now(),
							undefined,
							change
						);
						const volume24h = Number(ticker.volume_24h);
						if (Number.isFinite(volume24h) && volume24h >= 0) {
							setCrypto24hVolume(volume24h);
						}
						reconnectAttempt = 0;
						setConnectionError("");
						setConnectionStatus("live");
					} catch (error) {
						console.error("Unable to read Coinbase BTC-USD ticker:", error);
					}
				};
				socket.onerror = () => {
					if (!isMounted) return;
					setConnectionError("Coinbase live prices are temporarily unavailable; reconnecting.");
					setConnectionStatus("error");
					socket?.close();
				};
				socket.onclose = () => {
					if (!isMounted) return;
					setConnectionError("Coinbase live prices disconnected; reconnecting.");
					setConnectionStatus("error");
					const delay = Math.min(1000 * 2 ** reconnectAttempt, 30_000);
					reconnectAttempt += 1;
					reconnectTimer = window.setTimeout(connect, delay);
				};
			};

			connect();
			return () => {
				isMounted = false;
				if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
				socket?.close();
				unsubscribe();
				service.destroy();
				serviceRef.current = null;
			};
		}

		const refreshPrice = async () => {
			try {
				const quote = await fetchLatestStockQuote(stockId);
				if (!isMounted) return;
				if (quote.dataSource === "simulated") {
					setConnectionError("Market data is simulated rather than a live quote.");
					setConnectionStatus("simulated");
					return;
				}
				service.updateQuote(
					quote.price,
					quote.changePercent,
					quote.lastUpdated,
					quote.volume,
					quote.change
				);
				setConnectionError("");
				setConnectionStatus(quote.dataSource === "delayed" ? "delayed" : "live");
			} catch (error) {
				if (!isMounted) return;
				console.error("Unable to refresh stock market data:", error);
				setConnectionError(error instanceof Error ? error.message : "Unknown market-data error.");
				setConnectionStatus("error");
			}
		};

		void refreshPrice();
		const intervalId = window.setInterval(() => {
			void refreshPrice();
		}, 5000);

		return () => {
			isMounted = false;
			window.clearInterval(intervalId);
			unsubscribe();
			service.destroy();
			serviceRef.current = null;
		};
	}, [stockId, basePrice, initialTimeframe]);

	const setTimeframe = useCallback((timeframe: Timeframe) => {
		serviceRef.current?.setTimeframe(timeframe);
	}, []);

	return {
		candles: [
			...snapshot.historicalCandles,
			...(snapshot.currentCandle ? [snapshot.currentCandle] : []),
		],
		currentPrice: snapshot.currentPrice,
		change: snapshot.change,
		changePercent: snapshot.changePercent,
		timeframe: snapshot.timeframe,
		lastUpdated: snapshot.lastUpdated,
		setTimeframe,
		connectionStatus,
		connectionError,
		crypto24hVolume,
		volumeAvailable: snapshot.volumeAvailable,
		volumeLabel: snapshot.volumeLabel,
	};
}
