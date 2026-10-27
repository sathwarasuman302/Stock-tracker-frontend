import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { StockItem } from "../data/stocks";
import { fetchLiveStocks } from "../services/marketApi";
import StockPriceHeader from "../components/StockPriceHeader";
import ChartToolbar from "../components/ChartToolbar";
import LiveTradingViewChart from "../components/LiveTradingViewChart";
import YahooFinanceCandlestickChart from "../components/YahooFinanceCandlestickChart";
import AiMarketAnalysisPanel from "../components/AiMarketAnalysisPanel";
import OrderModal from "../components/OrderModal";
import { ToastContainer, useToast } from "../components/ToastNotification";
import { useMarketData } from "../hooks/useMarketData";
import { AuthContext } from "../contexts/AuthContext";
import {
	getCryptoPaperBalance,
	getCryptoPaperPositions,
	getInvestorBalance,
	getPaperPositions,
	placeCryptoPaperOrder,
	placePaperOrder,
	type InvestorBalance,
	type PaperPosition,
} from "../services/paperTradingService";

const sensexChartItem: StockItem = {
	id: "sensex",
	symbolKey: "stockSensex",
	exchangeKey: "exchangeBse",
	sectorKey: "sectorIndex",
	priceKey: "stockSensexPrice",
	changeKey: "stockSensexChange",
	basePrice: 77235.46,
	price: 77235.46,
	changePercent: 0,
};

const tradingViewSymbols: Record<string, string> = {
	"1": "NSE:RELIANCE",
	"2": "BSE:TCS",
	"5": "NSE:ICICIBANK",
	"6": "NSE:ITC",
	sensex: "BSE:SENSEX",
};

const formatTradeMoney = (value: number, currency: "INR" | "USD") =>
	new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);

function StockDetailPage() {
	const { stockId } = useParams();
	const navigate = useNavigate();
	const { t } = useTranslation("common");
	const { state: authState } = useContext(AuthContext);
	const { toasts, addToast, removeToast } = useToast();
	const [listedStocks, setListedStocks] = useState<StockItem[]>([]);
	const [stocksLoaded, setStocksLoaded] = useState(false);
	const [stockListError, setStockListError] = useState("");

	useEffect(() => {
		let active = true;
		const loadStocks = async () => {
			try {
				const stocks = await fetchLiveStocks();
				if (active) {
					setListedStocks(stocks);
					setStockListError("");
				}
			} catch (error) {
				if (active) {
					setListedStocks([]);
					setStockListError(error instanceof Error ? error.message : "Stocks are unavailable.");
				}
			} finally {
				if (active) setStocksLoaded(true);
			}
		};
		void loadStocks();
		const interval = window.setInterval(() => void loadStocks(), 5000);
		return () => {
			active = false;
			window.clearInterval(interval);
		};
	}, []);

	const chartStocks = [
		...listedStocks,
		...(listedStocks.some((item) => item.id === sensexChartItem.id)
			? []
			: [sensexChartItem]),
	];
	const stockSelectorStocks = chartStocks.filter(
		(item) => item.id !== "7" && !t(item.symbolKey).toUpperCase().includes("SENSEX")
	);
	const selectedStock = chartStocks.find((item) => item.id === stockId);
	const stock = selectedStock ?? sensexChartItem;
	const stockAvailable = Boolean(selectedStock);
	const isIndex = stock.id === sensexChartItem.id;
	const isCrypto = stock.exchangeKey === "exchangeCrypto";
	const usesYahooCandlestickChart = !isIndex;

	const symbol = t(stock.symbolKey);
	const exchange = t(stock.exchangeKey);
	const tradeCurrency = isCrypto ? "USD" : "INR";
	const quantityUnit = isCrypto ? "BTC" : "shares";
	const yahooSymbol = stock.id === "3" || symbol.toUpperCase() === "NIFTY"
		? "^NSEI"
		: isCrypto
			? symbol.toUpperCase()
			: /\.(NS|BO)$/i.test(symbol)
			? symbol.toUpperCase()
			: `${symbol.toUpperCase()}${exchange.toUpperCase().includes("BSE") ? ".BO" : ".NS"}`;
	const marketSymbol = stock.id === "3" ? "NIFTY" : symbol.toUpperCase();
	const tradingViewSymbol =
		tradingViewSymbols[stock.id] ??
		`${exchange.toUpperCase().includes("BSE") ? "BSE" : "NSE"}:${symbol
			.replace(/\.(NS|BO)$/i, "")
			.toUpperCase()}`;
	const stockMarketData = useMarketData(
		stock.id,
		stock.basePrice,
		"1m"
	);
	const chartData = stockMarketData;
	const {
		currentPrice,
		change,
		changePercent,
		connectionStatus,
		crypto24hVolume,
	} = stockMarketData;
	const { timeframe, setTimeframe } = chartData;

	const [orderModal, setOrderModal] = useState<{
		open: boolean;
		action: "buy" | "sell";
		defaultQuantity?: number;
		isClosingPosition: boolean;
	}>({ open: false, action: "buy", isClosingPosition: false });
	const [stockPosition, setStockPosition] = useState<PaperPosition | null>(null);
	const [investorBalance, setInvestorBalance] = useState<InvestorBalance | null>(null);

	const refreshPosition = useCallback(async () => {
		if (isIndex) {
			setStockPosition(null);
			setInvestorBalance(null);
			return;
		}
		if (!authState.isAuthenticated || !authState.user?.email || !["investor", "trader"].includes(authState.user.role ?? "")) {
			setStockPosition(null);
			setInvestorBalance(null);
			return;
		}
		const [positionsResult, balanceResult] = await Promise.allSettled([
			isCrypto ? getCryptoPaperPositions() : getPaperPositions(),
			isCrypto ? getCryptoPaperBalance() : getInvestorBalance(),
		]);
		if (positionsResult.status === "fulfilled") {
			const positions = positionsResult.value;
			const stockPositions = positions.filter((position) => position.stockId === stock.id);
			setStockPosition(
				stockPositions.find((position) => position.status === "OPEN") ??
					stockPositions[0] ??
					null
			);
		}
		setInvestorBalance(
			balanceResult.status === "fulfilled" ? balanceResult.value : null
		);
	}, [stock.id, isIndex, isCrypto, authState.isAuthenticated, authState.user?.email, authState.user?.role]);

	useEffect(() => {
		void refreshPosition();
		const intervalId = window.setInterval(() => void refreshPosition(), 3000);
		return () => window.clearInterval(intervalId);
	}, [refreshPosition]);

	const handleStockSelect = (id: string) => {
		navigate(`/stocks/${id}`);
	};

	const handleOrderOpen = (action: "buy" | "sell", closePosition = false) => {
		if (!authState.isAuthenticated || !["investor", "trader"].includes(authState.user?.role ?? "")) {
			addToast("Sign in with an investor or trader account to place orders.", "error");
			navigate("/login");
			return;
		}
		setOrderModal({
			open: true,
			action,
			defaultQuantity: closePosition ? stockPosition?.quantity : isCrypto ? 0.001 : undefined,
			isClosingPosition: closePosition,
		});
	};

	const handleOrderConfirm = useCallback(
		async (quantity: number) => {
			const result = isCrypto
				? await placeCryptoPaperOrder(orderModal.action, quantity, {
					stockId: stock.id,
					symbol,
				})
				: await placePaperOrder(stock.id, orderModal.action, quantity, {
					symbol,
					exchange,
					basePrice: stock.basePrice,
				});
			const currency = isCrypto ? "USD" : "INR";
			addToast(
				`${result.order.side} ${quantity} ${isCrypto ? "BTC" : symbol} @ ${formatTradeMoney(result.order.price, currency)} — Paper order filled`,
				"success"
			);
			setOrderModal({ open: false, action: "buy", isClosingPosition: false });
			await refreshPosition();
		},
		[stock.id, stock.basePrice, symbol, exchange, isCrypto, orderModal.action, addToast, refreshPosition]
	);

	if (!stockAvailable) {
		return (
			<main className="jp-page">
				<div className="container">
					<header className="jp-page__intro">
						<h1>{t("stocks")}</h1>
					</header>
					<p role={stockListError ? "alert" : undefined}>
						{!stocksLoaded
							? "Loading stock…"
							: stockListError || "Stock not found."}
					</p>
				</div>
			</main>
		);
	}

	return (
		<div className={`stock-detail-page${isCrypto ? " stock-detail-page--crypto" : ""}`}>
			<div className="stock-detail-terminal">
				<div className="stock-detail-terminal__center">
					{/* Stock selector tabs */}
					<div className="stock-selector">
						{stockSelectorStocks.map((item) => (
							<button
								key={item.id}
								type="button"
								className={`stock-selector__btn ${
									item.id === stock.id ? "is-active" : ""
								}`}
								onClick={() => handleStockSelect(item.id)}
							>
								{t(item.symbolKey)}
							</button>
						))}
					</div>

					<div className="stock-detail-instrument-heading">
						<h1>{symbol}</h1>
						<span>
							· {exchange}{isCrypto ? " · Bitcoin / U.S. Dollar · 24/7" : ""}
						</span>
					</div>

					{currentPrice > 0 && connectionStatus !== "loading" && connectionStatus !== "simulated" && (
						<StockPriceHeader
							symbol={symbol}
							exchange={exchange}
							price={currentPrice}
							change={change}
							changePercent={changePercent}
						/>
					)}

					{isCrypto && investorBalance && (
						<div className="crypto-paper-wallet" aria-label="USD crypto paper wallet">
							<div>
								<strong>USD paper wallet</strong>
								<span>Separate from your INR stock portfolio · simulated orders only</span>
							</div>
							<strong>
								{formatTradeMoney(investorBalance.availableCash, "USD")}
								<small> available</small>
							</strong>
						</div>
					)}

					{stockPosition && (
						<div className={`position-status position-status--${stockPosition.status.toLowerCase()}`}>
							<strong>{stockPosition.status}</strong>
							{stockPosition.status === "OPEN" ? (
								<span>
									{stockPosition.direction} · {stockPosition.quantity} {quantityUnit} · Avg entry {formatTradeMoney(stockPosition.averageBuyPrice, tradeCurrency)} · Unrealized P&amp;L {formatTradeMoney(stockPosition.unrealizedPnl, tradeCurrency)}
								</span>
							) : (
								<span>
									Closed · Final exit {formatTradeMoney(stockPosition.finalSellPrice ?? 0, tradeCurrency)} · Realized P&amp;L {formatTradeMoney(stockPosition.realizedPnl, tradeCurrency)}
								</span>
							)}
							{stockPosition.status === "OPEN" && (
								<button
									type="button"
									className="position-status__close"
									onClick={() => handleOrderOpen(stockPosition.direction === "SHORT" ? "buy" : "sell", true)}
								>
										{stockPosition.direction === "SHORT" ? "Buy to Cover" : "Close Position"}
								</button>
							)}
						</div>
					)}

					{!isIndex && (
						<ChartToolbar
							onBuy={() => handleOrderOpen("buy")}
							onSell={() => handleOrderOpen("sell")}
							tradingDisabled={currentPrice <= 0}
						/>
					)}

					{usesYahooCandlestickChart ? (
						<YahooFinanceCandlestickChart
							stockId={stock.id}
							stockName={symbol}
							yahooSymbol={yahooSymbol}
							marketSymbol={marketSymbol}
							exchange={exchange}
							timeframe={timeframe}
							onTimeframeChange={setTimeframe}
							currentPrice={currentPrice > 0 ? currentPrice : null}
							quoteCandles={chartData.candles}
							quoteTimestamp={chartData.lastUpdated}
							connectionStatus={connectionStatus}
							crypto24hVolume={isCrypto ? crypto24hVolume : null}
						/>
					) : (
						<LiveTradingViewChart
							key={stock.id}
							stockSymbol={symbol}
							stockExchange={exchange}
							tradingViewSymbol={tradingViewSymbol}
							timeframe={timeframe}
							onTimeframeChange={setTimeframe}
							supportedTimeframes={stock.id === "2" ? ["1D", "1W", "1M"] : undefined}
						/>
					)}
					{!isIndex && (
						<AiMarketAnalysisPanel
							stockId={stock.id}
							stockSymbol={symbol}
							timeframe={timeframe}
							currency={tradeCurrency}
						/>
					)}
				</div>
			</div>

			<OrderModal
				isOpen={orderModal.open}
				action={orderModal.action}
				symbol={symbol}
				currentPrice={currentPrice}
				availableCash={investorBalance?.availableCash}
				maxQuantity={stockPosition?.status === "OPEN" ? stockPosition.quantity : 0}
				positionDirection={stockPosition?.status === "OPEN" ? stockPosition.direction : undefined}
				defaultQuantity={orderModal.defaultQuantity}
				isClosingPosition={orderModal.isClosingPosition}
				currency={isCrypto ? "USD" : "INR"}
				fractionalQuantity={isCrypto}
				onConfirm={handleOrderConfirm}
				onCancel={() => setOrderModal({ open: false, action: "buy", isClosingPosition: false })}
			/>

			<ToastContainer toasts={toasts} onRemove={removeToast} />
		</div>
	);
}

export default StockDetailPage;
