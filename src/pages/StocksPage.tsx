import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { StockItem } from "../data/stocks";
import { featuredStocks } from "../data/stocks";
import YahooFinanceCandlestickChart from "../components/YahooFinanceCandlestickChart";
import StockPriceHeader from "../components/StockPriceHeader";
import AiMarketAnalysisPanel from "../components/AiMarketAnalysisPanel";
import { useMarketData } from "../hooks/useMarketData";
import { fetchLiveStocks } from "../services/marketApi";
import { AuthContext } from "../contexts/AuthContext";
import { readStockWatchlist, writeStockWatchlist } from "../services/stockWatchlist";
import { getAdminCatalogAsStockItems, isAdminStockDeleted } from "../services/adminStockCatalog";

const sbinStock: StockItem = {
	id: "8",
	symbolKey: "stockSbin",
	exchangeKey: "exchangeNse",
	sectorKey: "sectorBanking",
	priceKey: "stockSbinPrice",
	changeKey: "stockSbinChange",
	basePrice: 0,
	price: 0,
	changePercent: 0,
};

const stockOrder = ["2", "3", "4", "5", "6", "8"];
const stockCatalog = [
	...featuredStocks.filter((stock) => stockOrder.includes(stock.id)),
	sbinStock,
].sort((first, second) => stockOrder.indexOf(first.id) - stockOrder.indexOf(second.id));

const mergeStockCatalog = (liveStocks: StockItem[] = []): StockItem[] => {
	const catalog = new Map(
		[
			...stockCatalog.filter((stock) => !isAdminStockDeleted(stock.id)),
			...getAdminCatalogAsStockItems().filter((stock) => !isAdminStockDeleted(stock.id)),
		].map((stock) => [stock.id, stock])
	);
	const liveStocksAreAuthoritative = liveStocks.some(
		(stock) => stock.dataSource === "provider" || stock.dataSource === "delayed"
	);
	for (const stock of liveStocks) {
		if (catalog.has(stock.id) || stock.id.startsWith("admin-")) {
			catalog.set(stock.id, { ...catalog.get(stock.id), ...stock });
		}
	}
	return [...catalog.values()]
		.filter((stock) =>
			!isAdminStockDeleted(stock.id) &&
			(!liveStocksAreAuthoritative || liveStocks.some((listed) => listed.id === stock.id))
		)
		.sort((first, second) => {
			const firstIndex = stockOrder.indexOf(first.id);
			const secondIndex = stockOrder.indexOf(second.id);
			if (firstIndex !== -1 || secondIndex !== -1) {
				return (firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex) -
					(secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex);
			}
			return first.symbolKey.localeCompare(second.symbolKey);
		});
};

const formatPrice = (value: number, exchange: string) => {
	if (!Number.isFinite(value) || value <= 0) return "—";
	const isCrypto = exchange.toUpperCase() === "CRYPTO";
	return `${isCrypto ? "$" : "₹"}${value.toLocaleString(isCrypto ? "en-US" : "en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

const getYahooSymbol = (stock: StockItem, symbol: string, exchange: string) => {
	if (stock.id === "3") return "^NSEI";
	if (/\.(NS|BO)$/i.test(symbol)) return symbol.toUpperCase();
	return `${symbol.toUpperCase()}${exchange.toUpperCase() === "BSE" ? ".BO" : ".NS"}`;
};

const sourceLabel = (source?: StockItem["dataSource"]) => {
	if (source === "provider") return "Live quote";
	if (source === "delayed") return "Delayed quote";
	if (source === "simulated" || source === "fallback") return "Reference only";
	return "Waiting for quote";
};

function StocksPage() {
	const { t } = useTranslation("common");
	const { state: authState } = useContext(AuthContext);
	const [stocks, setStocks] = useState<StockItem[]>(() => mergeStockCatalog());
	const [selectedId, setSelectedId] = useState("2");
	const [listError, setListError] = useState("");
	const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
	const [watchlistError, setWatchlistError] = useState("");
	const [showStockPicker, setShowStockPicker] = useState(false);
	const accountEmail = authState.user?.email?.trim().toLowerCase();

	useEffect(() => {
		let active = true;
		const loadStocks = async () => {
			try {
				const liveStocks = await fetchLiveStocks();
				if (active) {
					setStocks(mergeStockCatalog(liveStocks));
					setListError("");
				}
			} catch (error) {
				if (!active) return;
				console.error("Unable to refresh the stocks watchlist:", error);
				setListError(error instanceof Error ? error.message : "Live stock quotes are unavailable.");
			}
		};

		void loadStocks();
		const intervalId = window.setInterval(() => void loadStocks(), 5000);
		return () => {
			active = false;
			window.clearInterval(intervalId);
		};
	}, []);

	useEffect(() => {
		try {
			setFavoriteIds(readStockWatchlist(accountEmail));
			setWatchlistError("");
		} catch (error) {
			setFavoriteIds([]);
			setWatchlistError(error instanceof Error ? error.message : "The saved watchlist could not be loaded.");
		}
	}, [accountEmail]);

	const toggleFavorite = (stockId: string) => {
		const nextIds = favoriteIds.includes(stockId)
			? favoriteIds.filter((id) => id !== stockId)
			: [...favoriteIds, stockId];
		try {
			writeStockWatchlist(accountEmail, nextIds);
			setFavoriteIds(nextIds);
			setWatchlistError("");
		} catch (error) {
			setWatchlistError(error instanceof Error ? error.message : "The watchlist could not be saved.");
		}
	};

	const favoriteStocks = stocks.filter((stock) => favoriteIds.includes(stock.id));
	const availableStocks = stocks.filter((stock) => !favoriteIds.includes(stock.id));
	const selectedStock = stocks.find((stock) => stock.id === selectedId) ?? stocks[0] ?? stockCatalog[0];
	const symbol = t(selectedStock.symbolKey);
	const exchange = t(selectedStock.exchangeKey);
	const marketExchange = selectedStock.id === "2" ? "BSE" : exchange.toUpperCase();
	const yahooSymbol = getYahooSymbol(selectedStock, symbol, marketExchange);
	const marketSymbol = selectedStock.id === "3" ? "NIFTY" : symbol.toUpperCase();
	const marketData = useMarketData(selectedStock.id, selectedStock.basePrice, "1m");
	const {
		currentPrice,
		change,
		changePercent,
		connectionStatus,
		crypto24hVolume,
		candles,
		lastUpdated,
		setTimeframe,
		timeframe,
	} = marketData;
	const selectedQuote = useMemo(
		() => stocks.find((stock) => stock.id === selectedId) ?? selectedStock,
		[selectedId, selectedStock, stocks]
	);
	const isPriceVerified = connectionStatus === "live" || connectionStatus === "delayed";

	return (
		<main className="jp-page stocks-market-page">
			<div className="container">
				<header className="jp-page__intro stocks-market-page__intro">
					<div>
						<p className="stocks-market-page__eyebrow">MARKET WATCH</p>
						<h1>{t("stocks")}</h1>
						<p>{t("stocksPageLead")}</p>
					</div>
					<span className={`stocks-market-page__market-status stocks-market-page__market-status--${connectionStatus}`}>
						<span aria-hidden="true" />
						{connectionStatus === "live"
							? "Live market feed"
							: connectionStatus === "delayed"
								? "Delayed market feed"
								: connectionStatus === "simulated"
									? "Reference prices"
									: connectionStatus === "error"
										? "Feed unavailable"
										: "Connecting"}
					</span>
				</header>

				{listError && (
					<p className="stocks-market-page__notice" role="status">
						Watchlist refresh failed: {listError} Previously loaded quotes are retained.
					</p>
				)}
				{watchlistError && (
					<p className="stocks-market-page__notice" role="alert">{watchlistError}</p>
				)}

				<div className="stocks-market-layout">
					<aside className="stocks-watchlist" aria-label="Market watchlist">
						<div className="stocks-watchlist__heading">
							<div>
								<h2>Watchlist</h2>
								<p>{favoriteStocks.length} saved {favoriteStocks.length === 1 ? "stock" : "stocks"}</p>
							</div>
							<button
								type="button"
								className="stocks-watchlist__manage"
								onClick={() => setShowStockPicker((visible) => !visible)}
								aria-expanded={showStockPicker}
							>
								{showStockPicker ? "Done" : "Add stocks"}
							</button>
						</div>
						<ul>
							{favoriteStocks.map((stock) => {
								const stockSymbol = t(stock.symbolKey);
								const isSelected = stock.id === selectedId;
								const isPositive = stock.changePercent >= 0;
								return (
									<li key={stock.id}>
										<button
											type="button"
											className={`stocks-watchlist__item${isSelected ? " is-selected" : ""}`}
											onClick={() => setSelectedId(stock.id)}
											aria-pressed={isSelected}
										>
											<span className="stocks-watchlist__identity">
												<strong>{stockSymbol}</strong>
												<small>{t(stock.exchangeKey)} · {sourceLabel(stock.dataSource)}</small>
											</span>
											<span className="stocks-watchlist__quote">
												<strong>{formatPrice(stock.price, stock.exchangeKey)}</strong>
												<small className={stock.price > 0 ? (isPositive ? "is-positive" : "is-negative") : ""}>
													{stock.price > 0 ? `${isPositive ? "+" : ""}${stock.changePercent.toFixed(2)}%` : "Quote unavailable"}
												</small>
											</span>
										</button>
										<button
											type="button"
											className="stocks-watchlist__favorite"
											onClick={() => toggleFavorite(stock.id)}
											aria-label={`Remove ${stockSymbol} from watchlist`}
											title="Remove from watchlist"
										>
											★
										</button>
									</li>
								);
							})}
						</ul>
						{favoriteStocks.length === 0 && (
							<p className="stocks-watchlist__empty">
								No liked stocks yet. Choose “Add stocks” to build your watchlist.
							</p>
						)}
						{showStockPicker && (
							<div className="stocks-watchlist__picker">
								<strong>Add stocks to your watchlist</strong>
								{availableStocks.length === 0
									? <p>All available stocks are already saved.</p>
									: <ul>
										{availableStocks.map((stock) => {
											const stockSymbol = t(stock.symbolKey);
											return (
												<li key={stock.id}>
													<span>{stockSymbol}</span>
													<button
														type="button"
														onClick={() => {
															toggleFavorite(stock.id);
															setSelectedId(stock.id);
														}}
														aria-label={`Add ${stockSymbol} to watchlist`}
													>
														Add
													</button>
												</li>
											);
										})}
									</ul>}
							</div>
						)}
						<p className="stocks-watchlist__footnote">
							Your saved stocks are stored for this account in this browser. Quotes refresh every five seconds; data may be delayed.
						</p>
					</aside>

					<section className="stocks-market-workspace" aria-label={`${symbol} trading chart`}>
						<div className="stocks-market-instrument">
							<div className="stocks-market-instrument__title">
								<div className="stocks-market-instrument__monogram" aria-hidden="true">
									{symbol.slice(0, 1)}
								</div>
								<div>
									<h2>{symbol}</h2>
									<p>{selectedStock.id === "3" ? "NIFTY 50 Index" : `${t(selectedStock.sectorKey)} · ${exchange}`} · {yahooSymbol}</p>
								</div>
							</div>
							<button
								type="button"
								className={`stocks-market-instrument__favorite${favoriteIds.includes(selectedStock.id) ? " is-saved" : ""}`}
								onClick={() => toggleFavorite(selectedStock.id)}
								aria-pressed={favoriteIds.includes(selectedStock.id)}
							>
								{favoriteIds.includes(selectedStock.id) ? "★ In watchlist" : "☆ Add to watchlist"}
							</button>
							<Link className="stocks-market-instrument__details" to={`/stocks/${selectedStock.id}`}>
								Full stock workspace <span aria-hidden="true">↗</span>
							</Link>
						</div>

						<div className="stocks-market-quote">
							{isPriceVerified && currentPrice > 0 ? (
								<StockPriceHeader
									symbol={symbol}
									exchange={exchange}
									price={currentPrice}
									change={change}
									changePercent={changePercent}
								/>
							) : (
								<div className="stocks-market-quote__unverified">
									<strong>{formatPrice(currentPrice || selectedQuote.price, selectedStock.exchangeKey)}</strong>
									<span>
										{connectionStatus === "error"
											? "Quote feed is unavailable; this is not a verified live price."
											: connectionStatus === "simulated"
												? "Reference price only · waiting for a provider quote."
												: "Connecting to the quote feed…"}
									</span>
								</div>
							)}
							{lastUpdated !== null && isPriceVerified && (
								<time dateTime={new Date(lastUpdated).toISOString()}>
									Updated {new Date(lastUpdated).toLocaleTimeString("en-IN", {
										hour: "2-digit",
										minute: "2-digit",
										second: "2-digit",
										timeZone: "Asia/Kolkata",
									})} IST
								</time>
							)}
						</div>

						<YahooFinanceCandlestickChart
							key={`market-chart-${selectedStock.id}`}
							stockId={selectedStock.id}
							stockName={symbol}
							yahooSymbol={yahooSymbol}
							marketSymbol={marketSymbol}
							exchange={marketExchange}
							timeframe={timeframe}
							onTimeframeChange={setTimeframe}
							currentPrice={isPriceVerified && currentPrice > 0 ? currentPrice : null}
							quoteCandles={candles}
							quoteTimestamp={lastUpdated}
							connectionStatus={connectionStatus}
							crypto24hVolume={crypto24hVolume}
						/>
						<AiMarketAnalysisPanel
							key={`market-analysis-${selectedStock.id}`}
							stockId={selectedStock.id}
							stockSymbol={symbol}
							timeframe={timeframe}
							currency="INR"
						/>
					</section>
				</div>
			</div>
		</main>
	);
}

export default StocksPage;
